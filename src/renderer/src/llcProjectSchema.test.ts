import { describe, it, expect } from 'vitest';
import { mapSaveableSegments, createSegment, addSegmentColorIndex } from './segments';
import { llcProjectV2Schema } from './types';

describe('project file with zoom points', () => {
  it('survives writing and reading the project file format', () => {
    const seg = addSegmentColorIndex({
      ...createSegment({ start: 10, end: 20, name: 'goal' }),
      playerName: 'Noam',
      zoomEase: 'linear' as const,
      zoomAnchors: [{ t: 10, rect: { x: 0, y: 0, w: 1, h: 1 } }, { t: 14, rect: { x: 0.3, y: 0.1, w: 0.5, h: 0.5 } }],
    }, 0);
    const json = structuredClone({ version: 2, mediaFileName: 'a.mp4', cutSegments: mapSaveableSegments([seg]) });
    const parsed = llcProjectV2Schema.parse(json);
    const restored = createSegment(parsed.cutSegments[0]);
    expect(restored.zoomAnchors?.[1]?.rect.x).toBe(0.3);
    expect(restored.zoomEase).toBe('linear');
    expect(restored.playerName).toBe('Noam');
  });

  it('still reads old project files without the new fields', () => {
    const parsed = llcProjectV2Schema.parse({ version: 2, cutSegments: [{ start: 1, end: 2, name: '' }] });
    expect(createSegment(parsed.cutSegments[0]).zoomAnchors).toBeUndefined();
  });
});
