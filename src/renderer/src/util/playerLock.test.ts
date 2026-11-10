// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';

import { clampSpot, DEFAULT_SPOT_SIZE, FREEZE_SECONDS, freezeFrameCount, isAtSpot, LOCK_ZOOM, lockStateAt, MAX_SPOT_SIZE, MIN_SPOT_SIZE } from './playerLock';

describe('player lock look', () => {
  it('lasts one and a half seconds, which is 45 frames at 30 fps', () => {
    expect(FREEZE_SECONDS).toBe(1.5);
    expect(freezeFrameCount(30)).toBe(45);
    expect(freezeFrameCount(25)).toBe(38);
  });

  it('starts calm, holds at full zoom, and ends back at the normal picture', () => {
    const start = lockStateAt(0);
    expect(start.zoom).toBe(1);
    expect(start.opacity).toBe(0);

    const hold = lockStateAt(0.7);
    expect(hold.zoom).toBeCloseTo(LOCK_ZOOM, 5);
    expect(hold.draw).toBeCloseTo(1, 5);
    expect(hold.opacity).toBeCloseTo(1, 5);

    const end = lockStateAt(FREEZE_SECONDS);
    expect(end.zoom).toBeCloseTo(1, 5);
    expect(end.opacity).toBeCloseTo(0, 5);
  });

  it('closes the ring in from a bigger one, and keeps it the same size on the picture while it zooms', () => {
    const relative = (t: number) => lockStateAt(t).ringScale / lockStateAt(t).zoom;
    expect(relative(0)).toBeGreaterThan(relative(0.5));
    expect(relative(0.5)).toBeCloseTo(1, 5);
  });

  it('keeps the mark inside the picture and the ring a sensible size', () => {
    const spot = clampSpot({ t: 4, x: 1.4, y: -0.2, size: 1 });
    expect(spot).toEqual({ t: 4, x: 1, y: 0, size: MAX_SPOT_SIZE });
    expect(clampSpot({ t: 4, x: 0.5, y: 0.5, size: 0 }).size).toBe(MIN_SPOT_SIZE);
    expect(DEFAULT_SPOT_SIZE).toBeGreaterThan(MIN_SPOT_SIZE);
    expect(DEFAULT_SPOT_SIZE).toBeLessThan(MAX_SPOT_SIZE);
  });

  it('shows the mark only on its own frame', () => {
    const spot = { t: 10, x: 0.5, y: 0.5, size: DEFAULT_SPOT_SIZE };
    expect(isAtSpot(spot, 10)).toBe(true);
    expect(isAtSpot(spot, 10.04)).toBe(true);
    expect(isAtSpot(spot, 10.5)).toBe(false);
    expect(isAtSpot(undefined, 10)).toBe(false);
    expect(isAtSpot(spot, null)).toBe(false);
  });
});
