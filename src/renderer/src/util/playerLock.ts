/**
 * Player lock: the picture freezes on one moment, a ring closes in on the player, his name shows above,
 * and the picture glides in and back out. All numbers here are the look we agreed on (from KICKO ONE);
 * the preview on screen and the export both use them, so they always match.
 */
import type { SpotMark } from '../types';

/** The whole freeze: ring and zoom come in, hold, and go back out, all on the still picture */
export const FREEZE_SECONDS = 1.5;
/** The ring closes in on the player */
export const DRAW_SECONDS = 10 / 30;
/** The ring and the zoom go back out during the last part of the freeze */
export const EXIT_SECONDS = 12 / 30;
export const ZOOM_IN_SECONDS = 8 / 30;
/** How close the picture glides in */
export const LOCK_ZOOM = 1.35;

/** Ring radius as a fraction of the picture height: 96 px on a 1080 px picture at half size (the small, wide-shot default) */
export const DEFAULT_SPOT_SIZE = 0.079;
export const MIN_SPOT_SIZE = 0.03;
export const MAX_SPOT_SIZE = 0.25;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInQuad = (t: number) => t * t;
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

export interface LockState {
  /** 0 → 1 while the ring closes in */
  draw: number,
  /** 0 → 1 while it goes back out */
  exit: number,
  /** Picture scale (1 = not zoomed) */
  zoom: number,
  /** Ring radius factor on top of the base radius (includes the zoom) */
  ringScale: number,
  /** Ring, card and dim opacity */
  opacity: number,
}

/** What the lock looks like `t` seconds into the freeze */
export function lockStateAt(t: number): LockState {
  const time = clamp(t, 0, FREEZE_SECONDS);
  const draw = easeOutCubic(clamp(time / DRAW_SECONDS, 0, 1));
  const exitStart = FREEZE_SECONDS - EXIT_SECONDS;
  const exitProgress = clamp((time - exitStart) / EXIT_SECONDS, 0, 1);
  const exit = easeInQuad(exitProgress);
  const zoomIn = 1 + (LOCK_ZOOM - 1) * easeOutCubic(clamp(time / ZOOM_IN_SECONDS, 0, 1));
  const zoom = time < exitStart ? zoomIn : 1 + (LOCK_ZOOM - 1) * (1 - easeInOutQuad(exitProgress));
  const ringScale = zoom * (1 + 0.35 * (1 - draw)) * (1 - 0.12 * exit);
  return { draw, exit, zoom, ringScale, opacity: draw * (1 - exit) };
}

/** The state shown while editing: ring fully drawn, picture not zoomed */
export const EDIT_STATE: LockState = { draw: 1, exit: 0, zoom: 1, ringScale: 1, opacity: 1 };

/** Number of frames the freeze lasts at a given frame rate */
export function freezeFrameCount(fps: number): number {
  return Math.max(1, Math.round(FREEZE_SECONDS * fps));
}

export function clampSpot(spot: SpotMark): SpotMark {
  return {
    t: spot.t,
    x: clamp(spot.x, 0, 1),
    y: clamp(spot.y, 0, 1),
    size: clamp(spot.size, MIN_SPOT_SIZE, MAX_SPOT_SIZE),
  };
}

/** The mark is only shown on its own frame (and the one next to it) */
export function isAtSpot(spot: SpotMark | undefined, time: number | null | undefined, fps = 30): boolean {
  if (spot == null || time == null) return false;
  return Math.abs(time - spot.t) <= 1.5 / fps;
}

/** Where the card sits: centered over the ring, above it, kept inside the picture */
export function cardPosition({ cx, cy, ringRadius, width, cardWidth, k }: {
  cx: number, cy: number, ringRadius: number, width: number, cardWidth: number, k: number,
}) {
  const half = cardWidth / 2;
  return {
    x: clamp(cx, half + 24 * k, Math.max(half + 24 * k, width - half - 24 * k)),
    top: Math.max(40 * k, cy - ringRadius - 96 * k),
  };
}

/** The zoom window (fractions of the picture) that keeps the ring where it is while the picture glides in */
export function lockZoomRect(spot: SpotMark, zoom: number) {
  const z = Math.max(1, zoom);
  return { x: spot.x * (1 - 1 / z), y: spot.y * (1 - 1 / z), w: 1 / z, h: 1 / z };
}

/**
 * The sound of the lock: two quick electronic blips, the second one higher.
 * Made from scratch (no sound file); the preview and the export both build it from these numbers.
 */
export const LOCK_SOUND = {
  blips: [
    { at: 0, freq: 880, seconds: 0.07 },
    { at: 0.09, freq: 1760, seconds: 0.14 },
  ],
  volume: 0.35,
} as const;
