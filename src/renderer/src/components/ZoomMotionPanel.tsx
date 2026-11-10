import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { FiPlay, FiTrash2 } from 'react-icons/fi';
import type { SpotMark, ZoomAnchor } from '../types';
import { LOCK_SOUND_IDS, LOCK_SOUND_LABELS, type LockSoundId } from '../util/playerLock';
import { rectAt, rectForLevel, sortAnchors, type ZoomEase, type ZoomMotionMode } from '../util/zoomAnchors';

interface Props {
  clipStart: number,
  clipEnd: number,
  /** Playhead time (absolute seconds) or null */
  playerTime: number | null | undefined,
  anchors: ZoomAnchor[],
  ease: ZoomEase,
  /** Index (in time order) of the point being edited on the picture, or null */
  selectedIndex: number | null,
  onSelect: (index: number | null, seekTo?: number) => void,
  onChange: (anchors: ZoomAnchor[]) => void,
  /** Remove one point (the last two points going away removes the whole movement) */
  onDeletePoint: (index: number) => void,
  onEaseChange: (ease: ZoomEase) => void,
  onPreset: (mode: ZoomMotionMode) => void,
  onClear: () => void,
  onPreview: () => void,
  /** Move the playhead (the strip on top of the curve works like the seek bar of a player) */
  onSeek: (seconds: number) => void,
  /** Player lock on this clip (freeze + ring + name at one moment), if any */
  lockSpot: SpotMark | undefined,
  /** Waiting for the click that places the ring */
  lockPlacing: boolean,
  onLockStart: () => void,
  onLockGo: () => void,
  onLockClear: () => void,
  /** The sound of the lock (or none) */
  lockSound: LockSoundId,
  onLockSoundChange: (id: LockSoundId) => void,
  /** Free zoom of the picture (for looking at far parts) */
  scale: number,
  wheelZoom: boolean,
  onToggleWheelZoom: () => void,
  onZoomIn: () => void,
  onZoomOut: () => void,
  onFit: () => void,
  /** A clip is selected (the movement tools only make sense inside a clip) */
  hasClip: boolean,
  /** The scissors / 10s 15s 20s buttons over the video are shown */
  clipButtonsVisible: boolean,
  onToggleClipButtons: () => void,
}

const PRESETS: { id: ZoomMotionMode, label: string, hint: string }[] = [
  { id: 'in', label: '↗ Zoom in', hint: 'Starts wide, moves in and stays' },
  { id: 'inout', label: '⌃ In & out', hint: 'Moves in, stays, then moves back out' },
  { id: 'out', label: '↘ Zoom out', hint: 'Starts close, then moves back out' },
];

const EASES: { id: ZoomEase, label: string }[] = [
  { id: 'smooth', label: 'Smooth' },
  { id: 'linear', label: 'Linear' },
  { id: 'dynamic', label: 'Dynamic' },
];

const MIN_GAP_S = 0.25;
const MAX_LEVEL = 4;
const GRAPH_H = 104;
const SCRUB_H = 22; // seek strip on top of the curve
const PAD_X = 16;
const PAD_Y = 14;
const HIT_PX = 13;

const chip: React.CSSProperties = { fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px', cursor: 'pointer', border: '1px solid #d0d5dd', background: '#ffffff', color: '#0f172a' };

const centerOf = (a: ZoomAnchor) => ({ x: a.rect.x + a.rect.w / 2, y: a.rect.y + a.rect.h / 2 });
const levelOf = (a: ZoomAnchor) => 1 / a.rect.w;

/**
 * The zoom curve of the selected clip. Drag a point sideways to change when it happens, up / down
 * to change how close it is. Click empty space to add a point, double-click a point to remove it.
 */
function ZoomGraph({ anchors, ease, clipStart, clipEnd, playerTime, selectedIndex, onSelect, onChange, onDeletePoint, onSeek }: Pick<Props, 'anchors' | 'ease' | 'clipStart' | 'clipEnd' | 'playerTime' | 'selectedIndex' | 'onSelect' | 'onChange' | 'onDeletePoint' | 'onSeek'>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const dragRef = useRef<number | null>(null);
  const scrubRef = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (el == null) return undefined;
    const ro = new ResizeObserver(() => setWidth(Math.max(200, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(200, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const sorted = sortAnchors(anchors);
  const dur = Math.max(0.1, clipEnd - clipStart);
  const px = (t: number) => PAD_X + ((t - clipStart) / dur) * (width - PAD_X * 2);
  const py = (level: number) => GRAPH_H - PAD_Y - ((Math.min(level, MAX_LEVEL) - 1) / (MAX_LEVEL - 1)) * (GRAPH_H - PAD_Y * 2);
  const timeAtX = (x: number) => clipStart + ((x - PAD_X) / (width - PAD_X * 2)) * dur;
  const levelAtY = (y: number) => 1 + ((GRAPH_H - PAD_Y - y) / (GRAPH_H - PAD_Y * 2)) * (MAX_LEVEL - 1);
  const levelAtTime = (t: number) => 1 / (rectAt(sorted, t, ease)?.w ?? 1);

  const points: string[] = [];
  for (let i = 0; i <= 120; i += 1) {
    const t = clipStart + (dur * i) / 120;
    points.push(`${px(t).toFixed(1)},${py(levelAtTime(t)).toFixed(1)}`);
  }
  const line = `M${points.join(' L')}`;
  const area = `${line} L${px(clipEnd)},${GRAPH_H - PAD_Y} L${px(clipStart)},${GRAPH_H - PAD_Y} Z`;

  // y is measured from the top of the curve area; the seek strip above it has negative y
  const local = (e: ReactPointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top - SCRUB_H };
  };
  const seekToX = (x: number) => onSeek(Math.min(clipEnd, Math.max(clipStart, timeAtX(x))));
  const nearestDot = (x: number, y: number) => {
    let best = -1;
    let bestD = HIT_PX;
    sorted.forEach((a, i) => {
      const d = Math.hypot(px(a.t) - x, py(levelOf(a)) - y);
      if (d <= bestD) { best = i; bestD = d; }
    });
    return best;
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const { x, y } = local(e);
    if (y < 0) {
      // The strip on top works like the seek bar of a player: click or drag to move the playhead
      scrubRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekToX(x);
      return;
    }
    const hit = nearestDot(x, y);
    if (hit >= 0) {
      dragRef.current = hit;
      e.currentTarget.setPointerCapture(e.pointerId);
      onSelect(hit, sorted[hit]!.t);
      return;
    }
    // Empty space: add a point here (the first click also adds a wide start so it glides in)
    const t = Math.min(clipEnd, Math.max(clipStart, timeAtX(x)));
    const level = Math.max(1, Math.min(MAX_LEVEL, levelAtY(y)));
    const current = rectAt(sorted, t, ease);
    const c = current != null ? { x: current.x + current.w / 2, y: current.y + current.h / 2 } : { x: 0.5, y: 0.5 };
    const added: ZoomAnchor = { t, rect: rectForLevel(level, c) };
    const base = sorted.length === 0 && t - clipStart > MIN_GAP_S ? [{ t: clipStart, rect: rectForLevel(1, c) }] : sorted;
    const next = sortAnchors([...base.filter((a) => Math.abs(a.t - t) >= MIN_GAP_S), added]);
    onChange(next);
    onSelect(next.indexOf(added), t);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (scrubRef.current) {
      seekToX(local(e).x);
      return;
    }
    const idx = dragRef.current;
    if (idx == null) return;
    const { x, y } = local(e);
    const a = sorted[idx];
    if (a == null) return;
    const lo = idx > 0 ? sorted[idx - 1]!.t + MIN_GAP_S : clipStart;
    const hi = idx < sorted.length - 1 ? sorted[idx + 1]!.t - MIN_GAP_S : clipEnd;
    const t = Math.min(Math.max(timeAtX(x), lo), Math.max(lo, hi));
    const level = Math.max(1, Math.min(MAX_LEVEL, levelAtY(y)));
    const next = sorted.map((p, i) => (i === idx ? { t, rect: rectForLevel(level, centerOf(p)) } : p));
    onChange(next);
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (scrubRef.current) {
      scrubRef.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }
    const idx = dragRef.current;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (idx != null && sorted[idx] != null) onSelect(idx, sorted[idx]!.t);
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const hit = nearestDot(e.clientX - r.left, e.clientY - r.top - SCRUB_H);
    if (hit < 0) return;
    onDeletePoint(hit);
  };

  const inside = playerTime != null && playerTime >= clipStart && playerTime <= clipEnd;
  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg
        width={width}
        height={GRAPH_H + SCRUB_H}
        role="img"
        aria-label="Zoom over time. Drag points to edit. The strip on top moves the playhead."
        style={{ display: 'block', background: '#0f172a', borderRadius: 8, touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
      >
        <rect x={0} y={0} width={width} height={SCRUB_H} fill="#1e293b" style={{ cursor: 'ew-resize' }} />
        <line x1={PAD_X} x2={width - PAD_X} y1={SCRUB_H / 2} y2={SCRUB_H / 2} stroke="#475569" strokeWidth="3" strokeLinecap="round" style={{ pointerEvents: 'none' }} />
        {inside && <circle cx={px(playerTime)} cy={SCRUB_H / 2} r={6} fill="#ffffff" style={{ pointerEvents: 'none' }} />}
        <g transform={`translate(0 ${SCRUB_H})`}>
          {[1, 2, 3, 4].map((l) => (
            <g key={l}>
              <line x1={PAD_X} x2={width - PAD_X} y1={py(l)} y2={py(l)} stroke="#1e293b" />
              <text x={2} y={py(l) + 3} fill="#64748b" fontSize="9">{l}×</text>
            </g>
          ))}
          {sorted.length > 0 && <path d={area} fill="rgba(210,255,0,0.14)" />}
          {sorted.length > 0 && <path d={line} fill="none" stroke="#d2ff00" strokeWidth="2.5" strokeLinejoin="round" />}
          {inside && (
            <>
              <line x1={px(playerTime)} x2={px(playerTime)} y1={4} y2={GRAPH_H - 4} stroke="#ffffff" strokeDasharray="3 3" />
              <text x={Math.min(px(playerTime) + 5, width - 34)} y={14} fill="#ffffff" fontSize="11" fontWeight="700">{levelAtTime(playerTime).toFixed(1)}×</text>
            </>
          )}
          {sorted.map((a, i) => (
            <circle
              key={a.t}
              cx={px(a.t)}
              cy={py(levelOf(a))}
              r={i === selectedIndex ? 8 : 6}
              fill={i === selectedIndex ? '#ffffff' : '#d2ff00'}
              stroke={i === selectedIndex ? '#d2ff00' : '#0f172a'}
              strokeWidth="3"
              style={{ cursor: 'grab' }}
            />
          ))}
          {sorted.length === 0 && (
            <text x={width / 2} y={GRAPH_H / 2 + 4} fill="#94a3b8" fontSize="12" textAnchor="middle">Click here to add a zoom point, or pick a ready-made movement above</text>
          )}
          <text x={PAD_X} y={GRAPH_H - 2} fill="#94a3b8" fontSize="9">0s</text>
          <text x={width - PAD_X} y={GRAPH_H - 2} fill="#94a3b8" fontSize="9" textAnchor="end">{dur.toFixed(0)}s</text>
        </g>
      </svg>
    </div>
  );
}

/**
 * Zoom Motion for the selected clip: a curve you edit by dragging points (when, and how close),
 * and a frame on the picture you drag to choose where the zoom looks.
 */
function ZoomMotionPanel({ clipStart, clipEnd, playerTime, anchors, ease, selectedIndex, onSelect, onChange, onDeletePoint, onEaseChange, onPreset, onClear, onPreview, onSeek, lockSpot, lockPlacing, onLockStart, onLockGo, onLockClear, lockSound, onLockSoundChange, scale, wheelZoom, onToggleWheelZoom, onZoomIn, onZoomOut, onFit, hasClip, clipButtonsVisible, onToggleClipButtons }: Props) {
  useEffect(() => {
    if (selectedIndex == null) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target as HTMLElement | null;
      if (target != null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      e.stopPropagation();
      onDeletePoint(selectedIndex);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [selectedIndex, onDeletePoint]);

  const hasAnchors = anchors.length > 0;
  const sorted = sortAnchors(anchors);
  const selected = selectedIndex != null ? sorted[selectedIndex] : undefined;

  return (
    <div className="no-user-select" style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px solid #e4e7ec', flexShrink: 0 }}>
      {hasClip && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>ZOOM MOTION</span>
            {PRESETS.map((p) => (
              <button key={p.id} type="button" title={p.hint} onClick={() => onPreset(p.id)} style={chip}>{p.label}</button>
            ))}
            <span style={{ width: 1, height: 18, background: '#d0d5dd' }} />
            {EASES.map((e) => (
              <button key={e.id} type="button" onClick={() => onEaseChange(e.id)} style={{ ...chip, borderColor: ease === e.id ? '#84cc16' : '#d0d5dd', background: ease === e.id ? '#f7fee7' : '#ffffff' }}>{e.label}</button>
            ))}
            <span style={{ flex: 1 }} />
            {selected != null && (
            <span style={{ fontSize: 11, color: '#3f6212', fontWeight: 700 }}>Drag the frame on the picture to choose where it looks · {levelOf(selected).toFixed(1)}×</span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {lockSpot == null ? (
                <button
                  type="button"
                  title="Freeze the picture on this moment and mark the player with a ring and his name"
                  onClick={onLockStart}
                  style={{ ...chip, background: lockPlacing ? '#d2ff00' : '#ffffff', borderColor: lockPlacing ? '#84cc16' : '#d0d5dd' }}
                >
                  {lockPlacing ? '◎ Click on the player' : '◎ Lock player'}
                </button>
              ) : (
                <>
                  <button type="button" title="Go to the moment of the lock" onClick={onLockGo} style={{ ...chip, background: '#f7fee7', borderColor: '#84cc16' }}>◎ Lock</button>
                  <button type="button" title="Remove the lock" aria-label="Remove the lock" onClick={onLockClear} style={chip}>✕</button>
                </>
              )}
              <select
                aria-label="Sound of the lock"
                title="The sound when the picture locks on the player"
                value={lockSound}
                onChange={(e) => onLockSoundChange(e.target.value as LockSoundId)}
                style={{ ...chip, padding: '2px 4px' }}
              >
                {LOCK_SOUND_IDS.map((id) => <option key={id} value={id}>{id === 'off' ? '🔇 No sound' : `🔊 ${LOCK_SOUND_LABELS[id]}`}</option>)}
              </select>
            </span>
            <button
              type="button"
              disabled={selected == null}
              title="Delete the selected point"
              aria-label="Delete the selected point"
              onClick={() => { if (selectedIndex != null) onDeletePoint(selectedIndex); }}
              style={{ ...chip, opacity: selected == null ? 0.4 : 1, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <FiTrash2 size={12} /> Point
            </button>
            <button type="button" disabled={!hasAnchors} onClick={() => { onClear(); onSelect(null); }} style={{ ...chip, opacity: hasAnchors ? 1 : 0.4 }}>Clear</button>
            <button type="button" disabled={!hasAnchors} onClick={onPreview} style={{ ...chip, background: '#0f172a', color: '#d2ff00', borderColor: '#0f172a', opacity: hasAnchors ? 1 : 0.4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <FiPlay size={11} /> Preview
            </button>
            <button
              type="button"
              title={clipButtonsVisible ? 'Hide the scissors and 10s / 15s / 20s buttons over the video' : 'Show the scissors and 10s / 15s / 20s buttons over the video'}
              onClick={onToggleClipButtons}
              style={{ ...chip, background: clipButtonsVisible ? '#0f172a' : '#ffffff', color: clipButtonsVisible ? '#d2ff00' : '#0f172a' }}
            >
              ✂️ 10s 15s 20s
            </button>
          </div>

          <ZoomGraph anchors={anchors} ease={ease} clipStart={clipStart} clipEnd={clipEnd} playerTime={playerTime} selectedIndex={selectedIndex} onSelect={onSelect} onChange={onChange} onDeletePoint={onDeletePoint} onSeek={onSeek} />
        </>
      )}

      {!hasClip && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>FREE LOOK</span>
        <button type="button" title="Zoom out" onClick={onZoomOut} style={chip}>−</button>
        <span style={{ minWidth: 34, textAlign: 'center', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{scale.toFixed(1)}×</span>
        <button type="button" title="Zoom in" onClick={onZoomIn} style={chip}>+</button>
        <button type="button" title="Show the whole picture" onClick={onFit} style={chip}>Fit</button>
        <button
          type="button"
          title={wheelZoom ? 'The mouse wheel zooms the picture (click to seek in time again)' : 'The mouse wheel seeks in time (click to zoom the picture with it)'}
          onClick={onToggleWheelZoom}
          style={{ ...chip, background: wheelZoom ? '#0f172a' : '#ffffff', color: wheelZoom ? '#d2ff00' : '#0f172a' }}
        >
          Wheel zoom
        </button>
        <span style={{ width: 1, height: 18, background: '#d0d5dd' }} />
        <button
          type="button"
          title={clipButtonsVisible ? 'Hide the ✂️ and 10s / 15s / 20s buttons over the video' : 'Show the ✂️ and 10s / 15s / 20s buttons over the video'}
          onClick={onToggleClipButtons}
          style={{ ...chip, background: clipButtonsVisible ? '#0f172a' : '#ffffff', color: clipButtonsVisible ? '#d2ff00' : '#0f172a' }}
        >
          ✂️ 10s 15s 20s
        </button>
      </div>
      )}
    </div>
  );
}

export default ZoomMotionPanel;
