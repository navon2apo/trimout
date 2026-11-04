import type { ZoomAnchor, ZoomRect } from '../types';

/** The whole picture — an anchor with this rect means "zoomed out". */
export const FULL_RECT: ZoomRect = { x: 0, y: 0, w: 1, h: 1 };

// Anchors closer than this (seconds) replace each other instead of stacking
const MIN_ANCHOR_GAP_S = 0.2;

export type ZoomEase = 'smooth' | 'linear' | 'dynamic';

// How the glide between two anchors is shaped. Must match easeExpr (ffmpeg) below.
const easeFn = (ease: ZoomEase, u: number) => {
  if (ease === 'linear') return u;
  if (ease === 'dynamic') return 1 - (1 - u) ** 3; // fast start, soft landing
  return u * u * (3 - 2 * u); // smooth: gentle start and stop
};

const easeExpr = (ease: ZoomEase, u: string) => {
  if (ease === 'linear') return `(${u})`;
  if (ease === 'dynamic') return `(1-(1-(${u}))*(1-(${u}))*(1-(${u})))`;
  return `(${u})*(${u})*(3-2*(${u}))`;
};

const byTime = (a: ZoomAnchor, b: ZoomAnchor) => a.t - b.t;

export function sortAnchors(anchors: ZoomAnchor[]): ZoomAnchor[] {
  return [...anchors].sort(byTime);
}

export function upsertAnchor(anchors: ZoomAnchor[] | undefined, anchor: ZoomAnchor): ZoomAnchor[] {
  const kept = (anchors ?? []).filter((a) => Math.abs(a.t - anchor.t) >= MIN_ANCHOR_GAP_S);
  return sortAnchors([...kept, anchor]);
}

export function removeAnchor(anchors: ZoomAnchor[], index: number): ZoomAnchor[] {
  return anchors.filter((_a, i) => i !== index);
}

/** The picture region shown at time `t`: held before the first / after the last anchor, gliding in between. */
export function rectAt(anchors: ZoomAnchor[] | undefined, t: number, ease: ZoomEase = 'smooth'): ZoomRect | null {
  if (anchors == null || anchors.length === 0) return null;
  const sorted = sortAnchors(anchors);
  const first = sorted[0]!;
  const last = sorted.at(-1)!;
  if (t <= first.t) return first.rect;
  if (t >= last.t) return last.rect;

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const e = easeFn(ease, (t - a.t) / (b.t - a.t));
      const mix = (from: number, to: number) => from + (to - from) * e;
      return { x: mix(a.rect.x, b.rect.x), y: mix(a.rect.y, b.rect.y), w: mix(a.rect.w, b.rect.w), h: mix(a.rect.h, b.rect.h) };
    }
  }
  return last.rect;
}

/** Anchor times relative to the clip start (what ffmpeg sees after seeking to the clip start). */
export function toClipRelative(anchors: ZoomAnchor[], clipStart: number): ZoomAnchor[] {
  return sortAnchors(anchors).map((a) => ({ ...a, t: a.t - clipStart }));
}

const num = (n: number) => n.toFixed(5);

/** ffmpeg expression that glides through `values` at `times` (same easing as rectAt). */
function glideExpr(times: number[], values: number[], ease: ZoomEase): string {
  let expr = num(values.at(-1)!);
  for (let i = times.length - 2; i >= 0; i -= 1) {
    const t0 = times[i]!;
    const t1 = times[i + 1]!;
    const v0 = values[i]!;
    const v1 = values[i + 1]!;
    // u runs 0..1 between the two anchors; clamped, so it also holds before the first anchor
    const u = `min(max((in_time-${num(t0)})/${num(t1 - t0)},0),1)`;
    const segment = `${num(v0)}+(${num(v1)}-${num(v0)})*${easeExpr(ease, u)}`;
    expr = `if(lt(in_time,${num(t1)}),${segment},${expr})`;
  }
  return expr;
}

const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);

/**
 * FFmpeg filter that renders the zoom: a fixed-size output whose window follows the anchors.
 * Anchor times must be relative to the clip start. The input is upscaled 2x first, so the
 * window position is sub-pixel accurate (no shaking while it glides).
 */
export function buildZoompanFilter({ anchors, width, height, fps, ease = 'smooth' }: {
  anchors: ZoomAnchor[],
  ease?: ZoomEase | undefined,
  width: number,
  height: number,
  fps: number,
}): string {
  const sorted = sortAnchors(anchors);
  const times = sorted.map((a) => a.t);
  const outW = even(width);
  const outH = even(height);

  // Window size is w (= h) of the picture, so zoom = 1 / w. x / y are the window's top-left corner.
  const w = glideExpr(times, sorted.map((a) => a.rect.w), ease);
  const x = glideExpr(times, sorted.map((a) => a.rect.x), ease);
  const y = glideExpr(times, sorted.map((a) => a.rect.y), ease);

  return `scale=${outW * 2}:${outH * 2},zoompan=z='1/(${w})':x='(${x})*iw':y='(${y})*ih':d=1:s=${outW}x${outH}:fps=${fps}`;
}

export type ZoomMotionMode = 'in' | 'inout' | 'out';

export interface ZoomMotionParams {
  mode: ZoomMotionMode,
  /** Zoom level at the peak, 1 = whole picture */
  level: number,
  /** Centre of the zoomed area, normalized 0..1 */
  center: { x: number, y: number },
  /** Seconds from the clip start until the movement begins */
  beginAt: number,
  /** Seconds the zoom-in takes / the zoom stays / the zoom-out takes */
  inDur: number,
  hold: number,
  outDur: number,
}

/** The zoomed window of `level` centred on `center`, kept inside the picture. */
export function rectForLevel(level: number, center: { x: number, y: number }): ZoomRect {
  const w = 1 / Math.max(1, level);
  const x = Math.min(Math.max(center.x - w / 2, 0), 1 - w);
  const y = Math.min(Math.max(center.y - w / 2, 0), 1 - w);
  return { x, y, w, h: w };
}

/**
 * Anchors for a ready-made movement inside one clip. Times are absolute (source seconds) and
 * kept inside the clip; the anchors stay at least MIN_ANCHOR_GAP_S apart.
 */
export function buildMotionAnchors(p: ZoomMotionParams, clipStart: number, clipEnd: number): ZoomAnchor[] {
  const zoomed = rectForLevel(p.level, p.center);
  const gap = MIN_ANCHOR_GAP_S + 0.01;
  const clamp = (t: number) => Math.min(Math.max(t, clipStart), clipEnd);
  const t0 = clamp(clipStart + Math.max(0, p.beginAt));
  const raw: ZoomAnchor[] = [];

  if (p.mode === 'in') {
    raw.push({ t: t0, rect: FULL_RECT }, { t: t0 + Math.max(gap, p.inDur), rect: zoomed });
  } else if (p.mode === 'out') {
    raw.push({ t: t0, rect: zoomed }, { t: t0 + Math.max(0, p.hold), rect: zoomed }, { t: t0 + Math.max(0, p.hold) + Math.max(gap, p.outDur), rect: FULL_RECT });
  } else {
    const a1 = t0 + Math.max(gap, p.inDur);
    const a2 = a1 + Math.max(0, p.hold);
    raw.push({ t: t0, rect: FULL_RECT }, { t: a1, rect: zoomed }, { t: a2, rect: zoomed }, { t: a2 + Math.max(gap, p.outDur), rect: FULL_RECT });
  }

  // Keep inside the clip, drop anchors that collapsed onto each other
  let result: ZoomAnchor[] = [];
  for (const a of raw) result = upsertAnchor(result, { ...a, t: clamp(a.t) });
  return result;
}
