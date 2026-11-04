import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { ZoomRect } from '../types';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>,
  /** The zoom frame of the selected point (normalized to the whole picture) */
  rect: ZoomRect,
  onChange: (rect: ZoomRect) => void,
}

const MIN_SIZE = 1 / 6;
const HANDLE = 14;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Corner = 'tl' | 'tr' | 'bl' | 'br';

/**
 * A frame drawn over the (whole) picture: drag it to move where the zoom looks,
 * drag a corner to change how close it is. The frame keeps the picture's shape.
 */
function ZoomRectOverlay({ videoRef, rect, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const drag = useRef<{ kind: 'move' | Corner, startX: number, startY: number, rect: ZoomRect } | null>(null);

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

  const start = (kind: 'move' | Corner) => (e: ReactPointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { kind, startX: e.clientX, startY: e.clientY, rect };
  };

  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (d == null || box == null) return;
    e.stopPropagation();
    const dx = (e.clientX - d.startX) / box.w;
    const dy = (e.clientY - d.startY) / box.h;
    const r = d.rect;
    if (d.kind === 'move') {
      onChange({ ...r, x: clamp(r.x + dx, 0, 1 - r.w), y: clamp(r.y + dy, 0, 1 - r.h) });
      return;
    }
    // Corner: the opposite corner stays put
    const fixedX = d.kind === 'tl' || d.kind === 'bl' ? r.x + r.w : r.x;
    const fixedY = d.kind === 'tl' || d.kind === 'tr' ? r.y + r.h : r.y;
    const movingX = (d.kind === 'tl' || d.kind === 'bl' ? r.x : r.x + r.w) + dx;
    const movingY = (d.kind === 'tl' || d.kind === 'tr' ? r.y : r.y + r.h) + dy;
    const maxW = (d.kind === 'tl' || d.kind === 'bl' ? fixedX : 1 - fixedX);
    const maxH = (d.kind === 'tl' || d.kind === 'tr' ? fixedY : 1 - fixedY);
    const size = clamp(Math.max(Math.abs(movingX - fixedX), Math.abs(movingY - fixedY)), MIN_SIZE, Math.min(maxW, maxH, 1));
    const x = d.kind === 'tl' || d.kind === 'bl' ? fixedX - size : fixedX;
    const y = d.kind === 'tl' || d.kind === 'tr' ? fixedY - size : fixedY;
    onChange({ x, y, w: size, h: size });
  };

  const end = (e: ReactPointerEvent) => {
    drag.current = null;
    if ((e.currentTarget as Element).hasPointerCapture(e.pointerId)) (e.currentTarget as Element).releasePointerCapture(e.pointerId);
  };

  const handleStyle = (corner: Corner): React.CSSProperties => ({
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    background: '#d2ff00',
    border: '2px solid #0f172a',
    borderRadius: 3,
    boxSizing: 'border-box',
    touchAction: 'none',
    cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
    left: corner === 'tl' || corner === 'bl' ? -HANDLE / 2 : undefined,
    right: corner === 'tr' || corner === 'br' ? -HANDLE / 2 : undefined,
    top: corner === 'tl' || corner === 'tr' ? -HANDLE / 2 : undefined,
    bottom: corner === 'bl' || corner === 'br' ? -HANDLE / 2 : undefined,
  });

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {box != null && (
        <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, pointerEvents: 'none' }}>
          <div
            role="presentation"
            onPointerDown={start('move')}
            onPointerMove={move}
            onPointerUp={end}
            style={{
              position: 'absolute',
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.w * 100}%`,
              height: `${rect.h * 100}%`,
              border: '2px solid #d2ff00',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
              boxSizing: 'border-box',
              cursor: 'move',
              pointerEvents: 'auto',
              touchAction: 'none',
            }}
          >
            {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((c) => (
              <div key={c} role="presentation" onPointerDown={start(c)} onPointerMove={move} onPointerUp={end} style={handleStyle(c)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ZoomRectOverlay;
