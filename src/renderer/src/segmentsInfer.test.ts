// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';

import { createSegment } from './segments';

describe('actions of clips saved by an older version', () => {
  it('gives the action back from the clip name', () => {
    expect(createSegment({ start: 1, end: 5, name: 'Dribble - 1v1 2' })).toMatchObject({ actionType: 'dribble' });
    expect(createSegment({ start: 1, end: 5, name: 'Distribution 1' })).toMatchObject({ actionType: 'distribution' });
    expect(createSegment({ start: 1, end: 5, name: 'Header 4' })).toMatchObject({ actionType: 'header' });
  });

  it('leaves other names and already known actions alone', () => {
    expect(createSegment({ start: 1, end: 5, name: 'חילוץ כדור 11' }).actionType).toBeUndefined();
    expect(createSegment({ start: 1, end: 5, name: 'Block 3', actionType: 'custom', actionLabel: 'My play' })).toMatchObject({ actionType: 'custom', actionLabel: 'My play' });
    expect(createSegment({ start: 1, end: 5, name: 'Block' }).actionType).toBeUndefined();
  });
});
