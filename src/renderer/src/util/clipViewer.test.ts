import { describe, expect, it } from 'vitest';

import { getClipViewerStep, getViewerClipIndexes } from './clipViewer';

const clips = [
  { start: 0, end: 8 },
  { start: 20, end: 26, isFavorite: true },
  { start: 40 },
  { start: 50, end: 55, isFavorite: true },
];

describe('getViewerClipIndexes', () => {
  it('lists every clip that has an end', () => {
    expect(getViewerClipIndexes(clips, false)).toEqual([0, 1, 3]);
  });

  it('can show only favorites', () => {
    expect(getViewerClipIndexes(clips, true)).toEqual([1, 3]);
  });
});

describe('getClipViewerStep', () => {
  it('keeps playing inside the clip', () => {
    expect(getClipViewerStep({ time: 22, clip: { start: 20, end: 26 }, autoAdvance: true, hasNext: true })).toBe('continue');
  });

  it('moves to the next clip at the end when playing through', () => {
    expect(getClipViewerStep({ time: 26, clip: { start: 20, end: 26 }, autoAdvance: true, hasNext: true })).toBe('advance');
  });

  it('stops at the end of a single clip', () => {
    expect(getClipViewerStep({ time: 26.1, clip: { start: 20, end: 26 }, autoAdvance: false, hasNext: true })).toBe('stop');
  });

  it('stops at the end of the last clip even when playing through', () => {
    expect(getClipViewerStep({ time: 26, clip: { start: 20, end: 26 }, autoAdvance: true, hasNext: false })).toBe('stop');
  });
});
