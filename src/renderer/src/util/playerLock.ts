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

export interface ViewRect {
  x: number,
  y: number,
  w: number,
  h: number,
}

const WHOLE: ViewRect = { x: 0, y: 0, w: 1, h: 1 };

/**
 * The view the lock starts from: what is on screen right now (with any zoom already applied).
 * If the player is not inside it, the lock works from the whole picture instead.
 */
export function lockStartView(spot: SpotMark, visible: ViewRect | null | undefined): ViewRect {
  if (visible == null) return WHOLE;
  const u = (spot.x - visible.x) / visible.w;
  const v = (spot.y - visible.y) / visible.h;
  return u >= 0.03 && u <= 0.97 && v >= 0.03 && v <= 0.97 ? visible : WHOLE;
}

/** The window to show "zoom" times closer than "view", keeping the player where he is on the screen. Zoom 1 gives the view back. */
export function lockViewRect(spot: SpotMark, view: ViewRect, zoom: number): ViewRect {
  const z = Math.max(1, zoom);
  const w = view.w / z;
  const h = view.h / z;
  const u = (spot.x - view.x) / view.w;
  const v = (spot.y - view.y) / view.h;
  return { x: clamp(spot.x - u * w, 0, 1 - w), y: clamp(spot.y - v * h, 0, 1 - h), w, h };
}

/** Where the ring is on the screen while the view is shown: position and size as fractions of the screen */
export function spotOnScreen(spot: SpotMark, view: ViewRect): SpotMark {
  return { t: spot.t, x: (spot.x - view.x) / view.w, y: (spot.y - view.y) / view.h, size: spot.size / view.h };
}

/**
 * The sounds of the lock. Made from scratch (no sound file). Each is a few tones; a tone starts at "at",
 * glides from "freq" to "freqEnd" (if given) and fades out over "seconds".
 * The preview and the export both build them from these numbers.
 */
export type LockSoundId = 'off' | 'blips' | 'sweep' | 'pings' | 'tick';

export interface LockTone {
  at: number,
  freq: number,
  freqEnd?: number,
  seconds: number,
  type: 'square' | 'sine' | 'triangle',
}

export const LOCK_SOUND_LABELS: Record<LockSoundId, string> = {
  off: 'No sound',
  blips: 'Blips',
  sweep: 'Sweep',
  pings: 'Pings',
  tick: 'Tick',
};
export const LOCK_SOUND_IDS = Object.keys(LOCK_SOUND_LABELS) as LockSoundId[];
export const DEFAULT_LOCK_SOUND: LockSoundId = 'blips';

const tone = (at: number, freq: number, seconds: number, type: LockTone['type'], freqEnd?: number): LockTone => (
  freqEnd == null ? { at, freq, seconds, type } : { at, freq, freqEnd, seconds, type }
);

export const LOCK_SOUNDS: Record<Exclude<LockSoundId, 'off'>, { volume: number, tones: LockTone[] }> = {
  blips: { volume: 0.35, tones: [tone(0, 880, 0.07, 'square'), tone(0.09, 1760, 0.14, 'square')] },
  sweep: { volume: 0.4, tones: [tone(0, 400, 0.28, 'sine', 1800)] },
  pings: { volume: 0.4, tones: [tone(0, 1300, 0.12, 'sine'), tone(0.11, 1300, 0.12, 'sine'), tone(0.22, 1700, 0.22, 'sine')] },
  tick: { volume: 0.45, tones: [tone(0, 300, 0.04, 'triangle'), tone(0.05, 2000, 0.2, 'sine')] },
};

export const isLockSoundId = (value: unknown): value is LockSoundId => typeof value === 'string' && value in LOCK_SOUND_LABELS;
