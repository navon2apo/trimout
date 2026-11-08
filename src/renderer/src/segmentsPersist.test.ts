import { describe, it, expect } from 'vitest';
import { mapSaveableSegments, createSegment, addSegmentColorIndex } from './segments';

const rect = (x: number) => ({ x, y: 0.1, w: 0.5, h: 0.5 });

describe('saving clips with zoom and soccer details', () => {
  const seg = addSegmentColorIndex({
    ...createSegment({ start: 10, end: 20, name: 'goal' }),
    playerName: 'Noam',
    actionType: 'goal',
    isFavorite: true,
    zoomEase: 'linear' as const,
    zoomAnchors: [{ t: 10, rect: { x: 0, y: 0, w: 1, h: 1 } }, { t: 14, rect: rect(0.3) }],
  }, 0);

  it('keeps zoom points, easing and soccer details', () => {
    const [saved] = mapSaveableSegments([seg]);
    expect(saved).toMatchObject({ start: 10, end: 20, playerName: 'Noam', actionType: 'goal', isFavorite: true, zoomEase: 'linear' });
    expect(saved?.zoomAnchors).toHaveLength(2);
  });

  it('does not add empty fields for plain clips', () => {
    const [saved] = mapSaveableSegments([addSegmentColorIndex(createSegment({ start: 1, end: 2 }), 0)]);
    expect(Object.keys(saved ?? {}).toSorted()).toEqual(['end', 'name', 'selected', 'start', 'tags']);
  });
});
