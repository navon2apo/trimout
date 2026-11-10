import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { SpotMark } from '../types';
import { FREEZE_SECONDS, lockStateAt, spotOnScreen, type LockSoundId, type LockState, type ViewRect } from '../util/playerLock';
import { drawPlayerLock } from '../util/playerLockDraw';
import playLockSound from '../util/playerLockSound';

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>,
  spot: SpotMark,
  label: string,
  /** The action, shown big at the top */
  title: string,
  /** The view that is on screen (the ring is drawn where the player is in it) */
  view: ViewRect,
  sound: LockSoundId,
  /** Called every frame, so the picture can glide in and out without re-rendering the app */
  onFrame: (state: LockState) => void,
  onDone: () => void,
}

/**
 * The freeze while a clip plays: the ring closes in, the picture glides closer, a short sound,
 * and after one and a half seconds the clip goes on. Same look and timing as the export.
 */
function PlayerLockPreview({ videoRef, spot, label, title, view, sound, onFrame, onDone }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState<{ x: number, y: number, w: number, h: number } | null>(null);
  const onFrameRef = useRef(onFrame);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onFrameRef.current = onFrame;
    onDoneRef.current = onDone;
  }, [onFrame, onDone]);

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
    return () => ro.disconnect();
  }, [videoRef]);

  useEffect(() => {
    if (box == null) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas == null || ctx == null) return undefined;
    const start = performance.now();
    let raf = 0;
    let finished = false;
    playLockSound(sound);
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const state = lockStateAt(elapsed);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPlayerLock(ctx, { width: box.w, height: box.h, spot: spotOnScreen(spot, view), label, title, state, time: elapsed });
      onFrameRef.current(state);
      if (elapsed >= FREEZE_SECONDS) {
        if (!finished) { finished = true; onDoneRef.current(); }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [box, spot, label, title, sound, view]);

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {box != null && (
        <canvas ref={canvasRef} width={Math.round(box.w)} height={Math.round(box.h)} style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, pointerEvents: 'none' }} />
      )}
    </div>
  );
}

export default PlayerLockPreview;
