/**
 * ClipsViewerDialog — watch every marked clip of the current video in one place.
 * Plays straight from the original video (nothing is exported), one clip or all in a row.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { FiChevronLeft, FiChevronRight, FiEdit2, FiPause, FiPlay, FiTrash2, FiX } from 'react-icons/fi';

import { getClipViewerStep, getViewerClipIndexes } from '../util/clipViewer';

interface Clip {
  segId?: string | undefined;
  start: number;
  end?: number | undefined;
  name?: string | undefined;
  actionLabel?: string | undefined;
  actionType?: string | undefined;
  isFavorite?: boolean | undefined;
}

interface Props {
  visible: boolean;
  videoUrl: string | undefined;
  // False when the video needs the compatibility player, which only drives the main view
  canPreview: boolean;
  clips: Clip[];
  getClipColor?: ((i: number) => string | undefined) | undefined;
  formatTimecode: (s: number) => string;
  onClose: () => void;
  onToggleFavorite: (i: number) => void;
  onDeleteClip: (i: number) => void;
  // Close the viewer and select the clip on the timeline for trimming
  onEditClip: (i: number) => void;
}

const clipName = (clip: Clip, i: number) => clip.name || clip.actionLabel || clip.actionType || `Clip ${i + 1}`;

function ClipsViewerDialog({ visible, videoUrl, canPreview, clips, getClipColor, formatTimecode, onClose, onToggleFavorite, onDeleteClip, onEditClip }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [playThrough, setPlayThrough] = useState(true);
  const [currentIndex, setCurrentIndex] = useState<number>();
  const [playing, setPlaying] = useState(false);
  // Play automatically once the newly chosen clip is in position
  const autoPlayRef = useRef(false);

  const indexes = useMemo(() => getViewerClipIndexes(clips, favoritesOnly), [clips, favoritesOnly]);
  const activeIndex = currentIndex != null && indexes.includes(currentIndex) ? currentIndex : indexes[0];
  const activeClip = activeIndex != null ? clips[activeIndex] : undefined;
  const position = activeIndex != null ? indexes.indexOf(activeIndex) : -1;
  const totalSeconds = indexes.reduce((sum, i) => sum + ((clips[i]!.end ?? 0) - clips[i]!.start), 0);

  // Start from the first clip each time the viewer opens
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    setCurrentIndex(undefined);
    setPlaying(false);
  }

  useEffect(() => {
    if (visible) dialogRef.current?.focus();
  }, [visible]);

  // Put the player at the start of the active clip whenever it changes
  const activeStart = activeClip?.start;
  useEffect(() => {
    const video = videoRef.current;
    if (!visible || video == null || activeStart == null) return;
    video.currentTime = activeStart;
    if (autoPlayRef.current) {
      autoPlayRef.current = false;
      video.play().catch(() => setPlaying(false));
    }
  }, [visible, activeIndex, activeStart]);

  const goTo = useCallback((i: number | undefined, play: boolean) => {
    if (i == null) return;
    autoPlayRef.current = play;
    if (i === activeIndex && videoRef.current != null && activeStart != null) {
      // Same clip again: the effect won't run, so restart it here
      autoPlayRef.current = false;
      videoRef.current.currentTime = activeStart;
      if (play) videoRef.current.play().catch(() => setPlaying(false));
    }
    setCurrentIndex(i);
  }, [activeIndex, activeStart]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (video == null || activeClip?.end == null) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    // Replay from the top after the clip has finished
    // (a clip at the very end of the file finishes with `ended` slightly before clip.end)
    if (video.ended || video.currentTime < activeClip.start || video.currentTime >= activeClip.end) video.currentTime = activeClip.start;
    video.play().catch(() => setPlaying(false));
  }, [activeClip]);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video == null || activeClip?.end == null || video.paused) return;
    const nextIndex = indexes[position + 1];
    const step = getClipViewerStep({ time: video.currentTime, clip: { start: activeClip.start, end: activeClip.end }, autoAdvance: playThrough, hasNext: nextIndex != null });
    if (step === 'advance') goTo(nextIndex, true);
    else if (step === 'stop') video.pause();
  }, [activeClip, goTo, indexes, playThrough, position]);

  const onKeyDown = useCallback((e: ReactKeyboardEvent) => {
    // Keep keys inside the viewer from reaching the editor's shortcuts
    e.stopPropagation();
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) {
      if (e.key === 'Escape') onClose();
      return;
    }
    switch (e.key) {
      case 'Escape': {
        onClose();
        break;
      }
      case ' ': {
        e.preventDefault();
        togglePlay();
        break;
      }
      case 'ArrowRight': {
        goTo(indexes[position + 1], true);
        break;
      }
      case 'ArrowLeft': {
        goTo(indexes[position - 1], true);
        break;
      }
      default:
    }
  }, [goTo, indexes, onClose, position, togglePlay]);

  if (!visible) return null;

  return (
    <div className="kicko-dialog-backdrop" role="presentation">
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <section ref={dialogRef} tabIndex={-1} className="kicko-dialog clips-viewer-dialog" role="dialog" aria-modal="true" aria-labelledby="clips-viewer-title" onKeyDown={onKeyDown}>
        <header className="kicko-dialog-header clips-viewer-header">
          <div>
            <h2 id="clips-viewer-title">Your clips</h2>
            <p>{indexes.length} clip{indexes.length !== 1 ? 's' : ''} · {totalSeconds.toFixed(1)}s total</p>
          </div>
          <label className="checkbox-control" htmlFor="clips-viewer-favorites">
            <input id="clips-viewer-favorites" type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} /> Favorites only
          </label>
          <button type="button" className="icon-button" title="Close" aria-label="Close" onClick={onClose}><FiX /></button>
        </header>

        <div className="clips-viewer-body">
          <div className="clips-viewer-stage">
            {canPreview ? (
              <>
                {/* Clips come from the user's own match video, which has no captions track */}
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  src={videoUrl}
                  preload="auto"
                  onClick={togglePlay}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onTimeUpdate={onTimeUpdate}
                />
                <div className="clips-viewer-now">
                  <div className="clips-viewer-now-title">
                    <strong dir="auto">{activeClip != null && activeIndex != null ? clipName(activeClip, activeIndex) : 'No clips to show'}</strong>
                    {activeClip?.end != null && (
                      <span>{formatTimecode(activeClip.start)} · {(activeClip.end - activeClip.start).toFixed(1)}s · {position + 1} of {indexes.length}</span>
                    )}
                  </div>
                  <div className="clips-viewer-controls">
                    <button type="button" className="icon-button" title="Previous clip" aria-label="Previous clip" disabled={position <= 0} onClick={() => goTo(indexes[position - 1], true)}><FiChevronLeft /></button>
                    <button type="button" className="clips-viewer-play" aria-label={playing ? 'Pause' : 'Play'} disabled={activeClip == null} onClick={togglePlay}>{playing ? <FiPause /> : <FiPlay />}</button>
                    <button type="button" className="icon-button" title="Next clip" aria-label="Next clip" disabled={position < 0 || position >= indexes.length - 1} onClick={() => goTo(indexes[position + 1], true)}><FiChevronRight /></button>
                    <label className="checkbox-control" htmlFor="clips-viewer-play-through">
                      <input id="clips-viewer-play-through" type="checkbox" checked={playThrough} onChange={(e) => setPlayThrough(e.target.checked)} /> Play all in a row
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <div className="clips-viewer-unavailable">
                This video format can only be played in the main player.
                <br />
                Close this window and use <b>Play all</b> in the clip list.
              </div>
            )}
          </div>

          <ol className="clips-viewer-list consistent-scrollbar">
            {indexes.length === 0 && <li className="clips-viewer-empty">{favoritesOnly ? 'No favorite clips yet. Tap ★ on a clip to add it.' : 'No clips marked yet.'}</li>}
            {indexes.map((i, n) => {
              const clip = clips[i]!;
              const isActive = i === activeIndex;
              return (
                <li key={clip.segId ?? `clip-${i}`} data-viewer-clip="true" className={`clips-viewer-item${isActive ? ' active' : ''}`}>
                  <span className="clips-viewer-item-bar" style={{ background: getClipColor?.(i) ?? '#94a3b8' }} />
                  <button type="button" className="clips-viewer-item-main" onClick={() => goTo(i, true)} title="Play this clip">
                    <span className="clips-viewer-item-num">{n + 1}</span>
                    <span className="clips-viewer-item-copy">
                      <strong dir="auto">{clipName(clip, i)}</strong>
                      <small>{formatTimecode(clip.start)} · {((clip.end ?? clip.start) - clip.start).toFixed(1)}s</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`clips-viewer-star${clip.isFavorite ? ' on' : ''}`}
                    aria-label={clip.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                    title={clip.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                    onClick={() => onToggleFavorite(i)}
                  >
                    ★
                  </button>
                  <button type="button" className="icon-button subtle" aria-label="Trim on the timeline" title="Trim on the timeline" onClick={() => onEditClip(i)}><FiEdit2 /></button>
                  <button type="button" className="icon-button subtle danger" aria-label="Delete clip" title="Delete clip" onClick={() => onDeleteClip(i)}><FiTrash2 /></button>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}

export default ClipsViewerDialog;
