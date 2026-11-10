/**
 * Player lock: the picture freezes on one moment, a ring closes in on the player, his name shows above,
 * and the picture glides in and back out. All numbers here are the look we agreed on (from KICKO ONE);
 * the preview on screen and the export both use them, so they always match.
 */
import type { SpotMark, ZoomAnchor } from '../types';
import { rectAt, type ZoomEase } from './zoomAnchors';

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

/** The colors the ring can have (lime is the KICKO look and the default) */
export const LOCK_COLORS = {
  lime: { label: 'Lime', hex: '#d2ff00' },
  white: { label: 'White', hex: '#ffffff' },
  yellow: { label: 'Yellow', hex: '#ffd60a' },
  red: { label: 'Red', hex: '#ff2d3d' },
  green: { label: 'Green', hex: '#22c55e' },
  blue: { label: 'Blue', hex: '#2f7bff' },
  black: { label: 'Black', hex: '#0a0d12' },
} as const;
export type LockColorId = keyof typeof LOCK_COLORS;
export const LOCK_COLOR_IDS = Object.keys(LOCK_COLORS) as LockColorId[];

/** What the lock shows and how it looks (the same for the whole export) */
export interface LockStyle {
  /** The player's name on the card above the ring */
  showName: boolean,
  /** The move (action) of the clip, big at the top */
  showAction: boolean,
  color: LockColorId,
}

export const DEFAULT_LOCK_STYLE: LockStyle = { showName: true, showAction: true, color: 'lime' };

/** Reads a saved style; anything missing or wrong falls back to the default */
export function parseLockStyle(raw: string | null | undefined): LockStyle {
  if (raw == null) return DEFAULT_LOCK_STYLE;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof LockStyle, unknown>>;
    return {
      showName: typeof value.showName === 'boolean' ? value.showName : DEFAULT_LOCK_STYLE.showName,
      showAction: typeof value.showAction === 'boolean' ? value.showAction : DEFAULT_LOCK_STYLE.showAction,
      color: typeof value.color === 'string' && value.color in LOCK_COLORS ? value.color as LockColorId : DEFAULT_LOCK_STYLE.color,
    };
  } catch {
    return DEFAULT_LOCK_STYLE;
  }
}

/**
 * Where the ring is in the finished clip. The export may zoom into the clip first and then change its shape
 * (9:16 etc.), so the mark made on the whole picture has to follow both steps.
 * Returns null when the player is not inside the finished picture any more.
 */
export function mapSpotToOutput({ spot, zoomRect, zoomSize, outSize, fit }: {
  spot: SpotMark,
  /** The part of the picture the clip shows at the moment of the lock (null = all of it) */
  zoomRect: ViewRect | null,
  /** Size of the picture after the zoom step */
  zoomSize: { w: number, h: number },
  /** Size of the finished clip */
  outSize: { w: number, h: number },
  /** How the shape was changed: crop = filled, pad = black bars, none = not changed */
  fit: 'none' | 'crop' | 'pad',
}): SpotMark | null {
  const rect = zoomRect ?? WHOLE;
  const u = (spot.x - rect.x) / rect.w;
  const v = (spot.y - rect.y) / rect.h;
  const sizeInZoom = spot.size / rect.h;
  let scale = 1;
  if (fit === 'crop') scale = Math.max(outSize.w / zoomSize.w, outSize.h / zoomSize.h);
  if (fit === 'pad') scale = Math.min(outSize.w / zoomSize.w, outSize.h / zoomSize.h);
  const x = (u * zoomSize.w * scale + (outSize.w - zoomSize.w * scale) / 2) / outSize.w;
  const y = (v * zoomSize.h * scale + (outSize.h - zoomSize.h * scale) / 2) / outSize.h;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { t: spot.t, x, y, size: (sizeInZoom * zoomSize.h * scale) / outSize.h };
}

const even = (n: number) => Math.max(2, Math.trunc(n / 2) * 2);

/**
 * The ring for one clip of the export: follows the clip's own zoom (fixed or moving) and its output shape.
 * "outSize" is the size of the finished clip, or null when the shape is not changed.
 */
export function lockSpotForClip({ spot, anchors, ease, source, outSize, fit }: {
  spot: SpotMark,
  anchors: ZoomAnchor[] | undefined,
  ease: ZoomEase | undefined,
  source: { w: number, h: number },
  outSize: { w: number, h: number } | null,
  fit: 'crop' | 'pad',
}): SpotMark | null {
  let zoomRect: ViewRect | null = null;
  let zoomSize = source;
  if (anchors != null && anchors.length === 1) {
    zoomRect = anchors[0]!.rect;
    zoomSize = { w: even(source.w * zoomRect.w), h: even(source.h * zoomRect.h) };
  } else if (anchors != null && anchors.length > 1) {
    zoomRect = rectAt(anchors, spot.t, ease ?? 'smooth');
  }
  return mapSpotToOutput({ spot, zoomRect, zoomSize, outSize: outSize ?? zoomSize, fit: outSize == null ? 'none' : fit });
}

/**
 * The sound as an ffmpeg "aevalsrc" expression (one channel), made from the same tones the app plays.
 * Square tones are made with gt(), triangles with asin(), sweeps by changing the frequency over the tone.
 */
export function lockSoundExpression(id: Exclude<LockSoundId, 'off'>): string {
  const { volume, tones } = LOCK_SOUNDS[id];
  const n = (value: number) => Number(value.toFixed(4)); // no long decimals in the expression
  return tones.map(({ at, freq, freqEnd, seconds, type }) => {
    const x = `(t-${at})`;
    const phase = freqEnd == null
      ? `2*PI*${freq}*${x}`
      : `2*PI*(${freq}*${x}+${n((freqEnd - freq) / (2 * seconds))}*${x}*${x})`;
    let wave = `sin(${phase})`;
    if (type === 'square') wave = `(gt(sin(${phase}),0)*2-1)`;
    if (type === 'triangle') wave = `(2/PI*asin(sin(${phase})))`;
    return `between(t,${at},${n(at + seconds)})*${volume}*min(1,${x}/0.005)*pow(max(0,1-${x}/${seconds}),2)*${wave}`;
  }).join('+');
}
