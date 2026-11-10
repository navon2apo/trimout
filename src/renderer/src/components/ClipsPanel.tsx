/**
 * ClipsPanel — the list of selected clips in the side panel.
 * Each clip is a clean white card: name (click to rename), duration, play, favorite, delete.
 * Clicking a card seeks the playhead to its start.
 */
import { memo, useEffect, useRef, useState } from 'react';
import { FiEye, FiEyeOff, FiMaximize2, FiPause, FiPlay, FiScissors, FiSquare, FiTrash2 } from 'react-icons/fi';

interface Seg {
  segId?: string | undefined;
  start: number;
  end?: number | undefined;
  name?: string | undefined;
  segColorIndex?: number | undefined;
  actionType?: string | undefined;
  actionLabel?: string | undefined;
  playerName?: string | undefined;
  isFavorite?: boolean | undefined;
  isUncertain?: boolean | undefined;
  zoomAnchors?: { t: number, rect: { x: number, y: number, w: number, h: number } }[] | undefined;
  /** Open eye = in the export (the default); false = left out */
  selected?: boolean | undefined;
  /** Player lock (freeze + ring + name) */
  spotMark?: { t: number, x: number, y: number, size: number } | undefined;
}

interface Props {
  segments: Seg[];
  currentSegIndex: number;
  playingClipIndex?: number | null | undefined;
  isPlayingAll: boolean;
  // Same color as the clip's block on the timeline
  getClipColor?: ((i: number) => string | undefined) | undefined;
  formatTimecode: (s: number) => string;
  onSegClick: (i: number) => void;
  onPlayClip: (i: number) => void;
  onDeleteSegment: (i: number) => void;
  onToggleFavorite: (i: number) => void;
  /** The eye: include or leave out of the export */
  onToggleIncluded: (i: number) => void;
  onRenameSegment: (i: number, name: string) => void;
  onPlayAll: () => void;
  onStopPlayAll: () => void;
  onOpenViewer: () => void;
}

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f43f5e', '#06b6d4', '#a3e635', '#fb923c',
];

function segColor(idx: number | undefined): string {
  return PALETTE[(idx ?? 0) % PALETTE.length] ?? '#38bdf8';
}

function fmtDuration(start: number, end: number | undefined): string {
  if (end == null) return '—';
  const s = end - start;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
}

const iconButton: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  fontSize: 13,
  flexShrink: 0,
};

function ClipsPanel({ segments, currentSegIndex, playingClipIndex, isPlayingAll, getClipColor, formatTimecode, onSegClick, onPlayClip, onDeleteSegment, onToggleFavorite, onToggleIncluded, onRenameSegment, onPlayAll, onStopPlayAll, onOpenViewer }: Props) {
  const activeRef = useRef<HTMLDivElement>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentSegIndex]);

  if (segments.length === 0) {
    return (
      <div style={{ padding: '22px 14px', textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: '#64748b' }}>
        <FiScissors style={{ fontSize: 22, marginBottom: 6 }} />
        <div>Press the scissors on the video<br />to mark an important moment</div>
      </div>
    );
  }

  const commitRename = (i: number) => {
    const name = draftName.trim();
    if (name.length > 0 && name !== segments[i]?.name) onRenameSegment(i, name);
    setEditingIndex(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', direction: 'ltr' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px 8px' }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
          {segments.length} clip{segments.length !== 1 ? 's' : ''}
          {segments.some((s) => s.selected === false) && (
            <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: '#64748b' }}>
              · {segments.filter((s) => s.selected !== false).length} in the export
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={isPlayingAll ? onStopPlayAll : onPlayAll}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
            border: isPlayingAll ? '1px solid #d0d5dd' : '1px solid #c2e600',
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: isPlayingAll ? '#ffffff' : '#d2ff00',
            color: '#0a1200',
          }}
        >
          {isPlayingAll ? <><FiSquare /> Stop</> : <><FiPlay /> Play all</>}
        </button>
        <button
          type="button"
          aria-label="Watch all clips"
          title="Watch all clips in a larger view"
          onClick={onOpenViewer}
          style={{ ...iconButton, width: 30, height: 30, border: '1px solid #d0d5dd', background: '#ffffff', color: '#0f172a' }}
        >
          <FiMaximize2 />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px 12px' }}>
        {segments.map((seg, i) => {
          const isActive = i === currentSegIndex;
          const isPlaying = i === playingClipIndex;
          const included = seg.selected !== false;
          const color = getClipColor?.(i) ?? segColor(seg.segColorIndex);
          const displayName = seg.name || seg.actionLabel || seg.actionType || `Clip ${i + 1}`;

          return (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            <div
              key={seg.segId ?? `seg-${i}`}
              ref={isActive ? activeRef : undefined}
              data-clip-card="true"
              onClick={() => onSegClick(i)}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                // The clip that is playing is clearly marked: thick outline in its own color and a tinted card
                background: isPlaying ? `${color}22` : '#ffffff',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                userSelect: 'none',
                border: `1px solid ${isPlaying ? color : (isActive ? '#84cc16' : '#e4e7ec')}`,
                boxShadow: isPlaying ? `0 0 0 3px ${color}` : (isActive ? '0 0 0 2px rgba(132,204,22,0.35)' : '0 1px 2px rgba(15,23,42,0.06)'),
                transition: 'box-shadow 0.12s, background 0.12s, opacity 0.12s',
                opacity: included || isPlaying ? 1 : 0.5,
              }}
            >
              <div style={{ width: isPlaying ? 9 : 5, flexShrink: 0, background: color }} />

              <div style={{ flex: 1, minWidth: 0, padding: '10px 10px 8px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {editingIndex === i ? (
                  <input
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    dir="auto"
                    value={draftName}
                    maxLength={80}
                    aria-label="Clip name"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={() => commitRename(i)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') commitRename(i);
                      if (e.key === 'Escape') setEditingIndex(null);
                    }}
                    style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, fontWeight: 600, color: '#0f172a', border: '1px solid #94a3b8', borderRadius: 6, padding: '3px 6px', outline: 'none' }}
                  />
                ) : (
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
                  <div
                    dir="auto"
                    title="Click to rename"
                    onClick={(e) => { e.stopPropagation(); setDraftName(seg.name ?? displayName); setEditingIndex(i); }}
                    style={{ fontSize: 14, fontWeight: 650, lineHeight: 1.25, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'text', textDecoration: included ? 'none' : 'line-through' }}
                  >
                    {displayName}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px 6px', fontSize: 11, color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontWeight: 700, color: '#334155', background: '#f1f5f9', borderRadius: 5, padding: '1px 6px' }}>{fmtDuration(seg.start, seg.end)}</span>
                  <span>{formatTimecode(seg.start)}</span>
                  {seg.spotMark != null && (
                    <span
                      title="This clip freezes on the player with a ring and his name"
                      style={{ fontWeight: 700, color: '#3f6212', background: '#ecfccb', borderRadius: 5, padding: '1px 6px' }}
                    >
                      ◎ lock
                    </span>
                  )}
                  {seg.zoomAnchors != null && seg.zoomAnchors.length > 0 && (
                    <span
                      title={seg.zoomAnchors.length > 1 ? 'This clip has a moving zoom — the export renders it' : 'This clip has a saved zoom — the export crops to it'}
                      style={{ fontWeight: 700, color: '#3f6212', background: '#ecfccb', borderRadius: 5, padding: '1px 6px' }}
                    >
                      {seg.zoomAnchors.length > 1
                        ? `🔍 ${seg.zoomAnchors.length} anchors`
                        : `🔍 ${(1 / seg.zoomAnchors[0]!.rect.w).toFixed(1)}x`}
                    </span>
                  )}
                </div>

                {/* The buttons get their own row, so nothing is squeezed: play on the left, the rest on the right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    aria-label={isPlaying ? 'Pause clip' : 'Play clip'}
                    title={isPlaying ? 'Pause' : 'Play clip'}
                    onClick={(e) => { e.stopPropagation(); onPlayClip(i); }}
                    style={{ ...iconButton, width: 32, height: 32, background: isPlaying ? '#d2ff00' : '#0f172a', color: isPlaying ? '#0f172a' : '#d2ff00' }}
                  >
                    {isPlaying ? <FiPause /> : <FiPlay />}
                  </button>
                  {isPlaying && (
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#0f172a', background: '#d2ff00', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>NOW PLAYING</span>
                  )}
                  <span style={{ flex: 1 }} />
                  <button
                    type="button"
                    aria-label={included ? 'In the export: click to leave out' : 'Left out of the export: click to include'}
                    title={included ? 'In the export (click to leave this clip out)' : 'Left out of the export (click to include it)'}
                    onClick={(e) => { e.stopPropagation(); onToggleIncluded(i); }}
                    style={{ ...iconButton, width: 32, height: 32, background: included ? 'transparent' : '#f1f5f9', fontSize: 18, color: included ? '#334155' : '#94a3b8' }}
                  >
                    {included ? <FiEye /> : <FiEyeOff />}
                  </button>
                  <button
                    type="button"
                    aria-label={seg.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                    title={seg.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(i); }}
                    style={{ ...iconButton, width: 32, height: 32, background: 'transparent', fontSize: 18, color: seg.isFavorite ? '#f59e0b' : '#cbd5e1' }}
                  >
                    ★
                  </button>
                  <button
                    type="button"
                    aria-label="Delete clip"
                    title="Delete clip"
                    onClick={(e) => { e.stopPropagation(); onDeleteSegment(i); }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                    style={{ ...iconButton, width: 32, height: 32, background: 'transparent', color: '#94a3b8', fontSize: 15 }}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ClipsPanel);
