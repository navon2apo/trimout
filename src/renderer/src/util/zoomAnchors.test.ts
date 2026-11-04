import { describe, expect, it } from 'vitest';

import type { ZoomAnchor } from '../types';
import { buildMotionAnchors, buildZoompanFilter, FULL_RECT, rectAt, removeAnchor, toClipRelative, upsertAnchor } from './zoomAnchors';

const zoomedIn = { x: 0.5, y: 0.4, w: 0.25, h: 0.25 };

describe('rectAt', () => {
  it('returns null without anchors', () => {
    expect(rectAt(undefined, 3)).toBeNull();
    expect(rectAt([], 3)).toBeNull();
  });

  it('a single anchor is a fixed zoom at any time', () => {
    const anchors: ZoomAnchor[] = [{ t: 10, rect: zoomedIn }];
    expect(rectAt(anchors, 0)).toEqual(zoomedIn);
    expect(rectAt(anchors, 99)).toEqual(zoomedIn);
  });

  it('holds before the first and after the last anchor', () => {
    const anchors: ZoomAnchor[] = [{ t: 10, rect: zoomedIn }, { t: 20, rect: FULL_RECT }];
    expect(rectAt(anchors, 5)).toEqual(zoomedIn);
    expect(rectAt(anchors, 25)).toEqual(FULL_RECT);
  });

  it('glides smoothly in between (smoothstep: halfway in time = halfway in value)', () => {
    const anchors: ZoomAnchor[] = [{ t: 10, rect: zoomedIn }, { t: 20, rect: FULL_RECT }];
    const mid = rectAt(anchors, 15)!;
    expect(mid.w).toBeCloseTo((0.25 + 1) / 2, 6);
    expect(mid.x).toBeCloseTo(0.25, 6);
    // ease in/out: a quarter of the way in time is less than a quarter of the way in value
    const quarter = rectAt(anchors, 12.5)!;
    expect(quarter.w).toBeLessThan(0.25 + 0.75 * 0.25);
  });

  it('works with unsorted anchors', () => {
    const anchors: ZoomAnchor[] = [{ t: 20, rect: FULL_RECT }, { t: 10, rect: zoomedIn }];
    expect(rectAt(anchors, 10)).toEqual(zoomedIn);
  });
});

describe('upsertAnchor / removeAnchor', () => {
  it('keeps anchors sorted by time', () => {
    const a = upsertAnchor(upsertAnchor(undefined, { t: 20, rect: FULL_RECT }), { t: 10, rect: zoomedIn });
    expect(a.map((x) => x.t)).toEqual([10, 20]);
  });

  it('replaces an anchor that is almost at the same time instead of stacking them', () => {
    const a = upsertAnchor([{ t: 10, rect: zoomedIn }], { t: 10.05, rect: FULL_RECT });
    expect(a).toHaveLength(1);
    expect(a[0]!.rect).toEqual(FULL_RECT);
  });

  it('removes by index', () => {
    const a = removeAnchor([{ t: 10, rect: zoomedIn }, { t: 20, rect: FULL_RECT }], 0);
    expect(a.map((x) => x.t)).toEqual([20]);
  });
});

describe('toClipRelative', () => {
  it('shifts times so the clip start is 0', () => {
    const rel = toClipRelative([{ t: 254, rect: zoomedIn }, { t: 265, rect: FULL_RECT }], 250);
    expect(rel.map((x) => x.t)).toEqual([4, 15]);
  });
});

describe('buildZoompanFilter', () => {
  const anchors: ZoomAnchor[] = [{ t: 1, rect: zoomedIn }, { t: 4, rect: FULL_RECT }];

  it('uses fixed output size and the source frame rate', () => {
    const f = buildZoompanFilter({ anchors, width: 2048, height: 1152, fps: 30 });
    expect(f).toContain('s=2048x1152');
    expect(f).toContain('fps=30');
    expect(f).toContain('d=1');
    // upscaled first so the window position is sub-pixel accurate
    expect(f.startsWith('scale=4096:2304,zoompan=')).toBe(true);
  });

  it('animates zoom, x and y from the input timestamp', () => {
    const f = buildZoompanFilter({ anchors, width: 2048, height: 1152, fps: 30 });
    expect(f).toContain("z='1/(");
    expect(f).toContain("x='(");
    expect(f).toContain("y='(");
    expect(f).toContain('in_time');
  });

  it('rounds the output size down to even numbers (H.264 yuv420p)', () => {
    const f = buildZoompanFilter({ anchors, width: 2049, height: 1153, fps: 30 });
    expect(f).toContain('s=2048x1152');
  });

  it('a single anchor needs no animation', () => {
    const f = buildZoompanFilter({ anchors: [{ t: 1, rect: zoomedIn }], width: 2048, height: 1152, fps: 30 });
    expect(f).not.toContain('in_time');
  });
});

describe('zoom motion presets', () => {
  const center = { x: 0.5, y: 0.5 };
  const base = { level: 2, center, beginAt: 1, inDur: 1, hold: 2, outDur: 1 };

  it('zoom in starts on the whole picture, then holds the zoom', () => {
    const a = buildMotionAnchors({ ...base, mode: 'in' }, 10, 20);
    expect(a).toHaveLength(2);
    expect(a[0]).toMatchObject({ t: 11, rect: FULL_RECT });
    expect(a[1]!.t).toBe(12);
    expect(a[1]!.rect.w).toBeCloseTo(0.5);
  });

  it('in & out goes wide, close, close, wide', () => {
    const a = buildMotionAnchors({ ...base, mode: 'inout' }, 10, 20);
    expect(a.map((x) => x.t)).toEqual([11, 12, 14, 15]);
    expect(a.map((x) => x.rect.w)).toEqual([1, 0.5, 0.5, 1]);
  });

  it('zoom out starts close and ends on the whole picture', () => {
    const a = buildMotionAnchors({ ...base, mode: 'out' }, 10, 20);
    expect(a[0]!.rect.w).toBeCloseTo(0.5);
    expect(a.at(-1)!.rect).toEqual(FULL_RECT);
  });

  it('keeps every anchor inside the clip', () => {
    const a = buildMotionAnchors({ ...base, mode: 'inout', hold: 30 }, 10, 20);
    expect(a.every((x) => x.t >= 10 && x.t <= 20)).toBe(true);
  });

  it('linear easing is halfway at the midpoint', () => {
    const anchors = [{ t: 0, rect: FULL_RECT }, { t: 2, rect: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 } }];
    expect(rectAt(anchors, 1, 'linear')!.w).toBeCloseTo(0.75);
  });
});
