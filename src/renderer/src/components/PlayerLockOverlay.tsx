import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { SpotMark } from '../types';
import { clampSpot, EDIT_STATE, MAX_SPOT_SIZE, MIN_SPOT_SIZE } from '../util/playerLock';
import { drawPlayerLock, ringRadiusPx } from '../util/playerLockDraw';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>,
  /** The mark being edited; none = waiting for the click that places it */
  spot: SpotMark | undefined,
  /** The name on the card */
  label: string,
  /** Click on the picture: where the player is (fractions of the picture) */
  onPlace: (x: number, y: number) => void,
  onChange: (spot: SpotMark) => void,
}

const HANDLE = 16;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br'];
const DIAG = Math.SQRT1_2;

/**
 * The player lock on top of the paused picture. First click places the ring on the player; after that
 * drag the ring to move it and drag a corner handle to make it bigger or smaller.
 */
function PlayerLockOverlay({ videoRef, spot, label, onPlace, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const drag = useRef<{ kind: 'move' | 'size', startX: number, startY: number, spot: SpotMark } | null>(null);

  // Where the picture sits inside this overlay (the video is letterboxed to keep its shape)
  useEffect(() => {
    const root = rootRef.current;
    if (root == null) return undefined;
    const measure = () => {
      const v = videoRef.current;
      const W = root.clientWidth;
      const H = root.clientHeight;
      const ratio = v != null && v.videoWidth > 0 && v.videoHeight > 0 ? v.videoWidth / v.videoHeight : W / H;
      const w = Math.min(W, H * ratio);
      const h = w / ratio;
      setBox({ x: (W - w) / 2, y: (H - h) / 2, w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    const v = videoRef.current;
    v?.addEventListener('loadedmetadata', measure);
    return () => { ro.disconnect(); v?.removeEventListener('loadedmetadata', measure); };
  }, [videoRef]);

  // The ring and the name card, drawn exactly like the export draws them
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null || box == null) return;
    const ctx = canvas.getContext('2d');
    if (ctx == null) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (spot != null) drawPlayerLock(ctx, { width: box.w, height: box.h, spot, label, state: EDIT_STATE, time: 0 });
  }, [box, spot, label]);

  const startDrag = (kind: 'move' | 'size') => (e: ReactPointerEvent) => {
    if (spot == null) return;
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { kind, startX: e.clientX, startY: e.clientY, spot };
  };

  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d == null || box == null) return;
    e.stopPropagation();
    if (d.kind === 'move') {
      onChange(clampSpot({ ...d.spot, x: d.spot.x + (e.clientX - d.startX) / box.w, y: d.spot.y + (e.clientY - d.startY) / box.h }));
      return;
    }
    // Size: how far the pointer is from the center of the ring
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect == null) return;
    const px = e.clientX - rect.left - box.x;
    const py = e.clientY - rect.top - box.y;
    const dist = Math.hypot(px - d.spot.x * box.w, py - d.spot.y * box.h);
    onChange(clampSpot({ ...d.spot, size: clamp(dist / box.h, MIN_SPOT_SIZE, MAX_SPOT_SIZE) }));
  };

  const endDrag = (e: ReactPointerEvent) => {
    drag.current = null;
    if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) (e.currentTarget as Element).releasePointerCapture(e.pointerId);
  };

  const onPickPlace = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (box == null) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / box.w;
    const y = (e.clientY - rect.top) / box.h;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    e.stopPropagation();
    onPlace(x, y);
  };

  const cx = spot != null && box != null ? spot.x * box.w : 0;
  const cy = spot != null && box != null ? spot.y * box.h : 0;
  const r = spot != null && box != null ? ringRadiusPx(spot, box.h) : 0;

  const handleStyle = (corner: Corner): React.CSSProperties => {
    const sx = corner === 'tl' || corner === 'bl' ? -1 : 1;
    const sy = corner === 'tl' || corner === 'tr' ? -1 : 1;
    return {
      position: 'absolute',
      left: cx + sx * r * DIAG - HANDLE / 2,
      top: cy + sy * r * DIAG - HANDLE / 2,
      width: HANDLE,
      height: HANDLE,
      background: '#d2ff00',
      border: '2px solid #0f172a',
      borderRadius: 3,
      boxSizing: 'border-box',
      touchAction: 'none',
      pointerEvents: 'auto',
      cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
    };
  };

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {box != null && (
        <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, pointerEvents: 'none' }}>
          <canvas ref={canvasRef} width={Math.round(box.w)} height={Math.round(box.h)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

          {spot == null && (
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
            <div
              onPointerDown={onPickPlace}
              style={{ position: 'absolute', inset: 0, cursor: 'crosshair', pointerEvents: 'auto', background: 'rgba(0,0,0,0.12)' }}
            >
              <div style={{ position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                <span style={{ background: '#0f172a', color: '#d2ff00', fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 6 }}>Click on the player</span>
              </div>
            </div>
          )}

          {spot != null && (
            <>
              <div
                role="presentation"
                onPointerDown={startDrag('move')}
                onPointerMove={onMove}
                onPointerUp={endDrag}
                title="Drag to move the ring"
                style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', cursor: 'move', pointerEvents: 'auto', touchAction: 'none' }}
              />
              {CORNERS.map((c) => (
                <div key={c} role="presentation" title="Drag to change the size" onPointerDown={startDrag('size')} onPointerMove={onMove} onPointerUp={endDrag} style={handleStyle(c)} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerLockOverlay;
