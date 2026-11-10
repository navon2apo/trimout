// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';

import { clampSpot, DEFAULT_SPOT_SIZE, FREEZE_SECONDS, freezeFrameCount, isAtSpot, LOCK_ZOOM, lockStartView, lockStateAt, lockViewRect, MAX_SPOT_SIZE, MIN_SPOT_SIZE, spotOnScreen } from './playerLock';

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

describe('zoom from the view on screen', () => {
  const spot = { t: 1, x: 0.5, y: 0.5, size: 0.08 };

  it('starts from the whole picture when nothing is zoomed, and keeps the player in place', () => {
    const view = lockStartView(spot, null);
    expect(view).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    const closer = lockViewRect(spot, view, 2);
    expect(closer.w).toBeCloseTo(0.5, 5);
    expect(closer.x + closer.w / 2).toBeCloseTo(0.5, 5);
  });

  it('starts from the zoomed view that is already on screen and comes back to exactly it', () => {
    const visible = { x: 0.2, y: 0.3, w: 0.5, h: 0.5 };
    const view = lockStartView(spot, visible);
    expect(view).toEqual(visible);
    expect(lockViewRect(spot, view, 1)).toEqual(visible);
    const closer = lockViewRect(spot, view, 1.35);
    expect(closer.w).toBeCloseTo(0.5 / 1.35, 5);
    // The player stays at the same place on the screen
    const before = (spot.x - view.x) / view.w;
    const after = (spot.x - closer.x) / closer.w;
    expect(after).toBeCloseTo(before, 5);
  });

  it('works from the whole picture when the player is outside the zoomed view', () => {
    expect(lockStartView({ ...spot, x: 0.9 }, { x: 0.1, y: 0.1, w: 0.4, h: 0.4 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('draws the ring where the player is on the zoomed screen, and bigger', () => {
    const onScreen = spotOnScreen(spot, { x: 0.25, y: 0.25, w: 0.5, h: 0.5 });
    expect(onScreen.x).toBeCloseTo(0.5, 5);
    expect(onScreen.size).toBeCloseTo(0.16, 5);
  });
});
