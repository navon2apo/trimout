import { describe, expect, it } from 'vitest';

import { MIN_CLIP_SECONDS, getNextPlayableClipIndex, getUserClips, trimClipEdge } from './clipTrim';

describe('trimClipEdge', () => {
  const clip = { start: 10, end: 20 };

  it('moves the start edge and keeps the end', () => {
    expect(trimClipEdge(clip, 'start', 12.5, 100)).toEqual({ start: 12.5, end: 20 });
  });

  it('moves the end edge and keeps the start', () => {
    expect(trimClipEdge(clip, 'end', 26, 100)).toEqual({ start: 10, end: 26 });
  });

  it('never lets the start cross the end', () => {
    expect(trimClipEdge(clip, 'start', 25, 100)).toEqual({ start: 20 - MIN_CLIP_SECONDS, end: 20 });
  });

  it('never lets the end cross the start', () => {
    expect(trimClipEdge(clip, 'end', 3, 100)).toEqual({ start: 10, end: 10 + MIN_CLIP_SECONDS });
  });

  it('keeps both edges inside the video', () => {
    expect(trimClipEdge(clip, 'start', -4, 100)).toEqual({ start: 0, end: 20 });
    expect(trimClipEdge(clip, 'end', 140, 100)).toEqual({ start: 10, end: 100 });
  });
});

describe('getNextPlayableClipIndex', () => {
  const clips = [
    { start: 0, end: 5 },
    { start: 8 },
    { start: 12, end: 18 },
  ];

  it('starts at the first finished clip', () => {
    expect(getNextPlayableClipIndex(clips, -1)).toBe(0);
  });

  it('skips clips that have no end', () => {
    expect(getNextPlayableClipIndex(clips, 0)).toBe(2);
  });

  it('returns undefined after the last clip', () => {
    expect(getNextPlayableClipIndex(clips, 2)).toBeUndefined();
  });
});

describe('getUserClips', () => {
  it('hides the automatic whole-video segment, which the user never selected', () => {
    expect(getUserClips([{ start: 0, end: 25, initial: true }])).toEqual([]);
  });

  it('keeps the clips the user marked', () => {
    const clips: { start: number, end: number, initial?: boolean }[] = [{ start: 2, end: 8 }, { start: 10, end: 15 }];
    expect(getUserClips(clips)).toEqual(clips);
  });
});
