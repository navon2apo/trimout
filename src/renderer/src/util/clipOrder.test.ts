// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';

import { exportNumbers, moveItem, reorderByIds } from './clipOrder';

describe('moveItem', () => {
  it('moves an item to a new place', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('stays the same when nothing moves, or the place is outside the list', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 1, 1)).toBe(list);
    expect(moveItem(list, 5, 0)).toBe(list);
    expect(moveItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
  });
});

describe('reorderByIds', () => {
  const segments = [{ segId: 'a' }, { segId: 'b' }, { segId: 'c' }];

  it('puts the segments in the given order', () => {
    expect(reorderByIds(segments, ['c', 'a', 'b']).map((s) => s.segId)).toEqual(['c', 'a', 'b']);
  });

  it('keeps segments that are not mentioned, after the others, and ignores unknown ids', () => {
    expect(reorderByIds(segments, ['c', 'zzz']).map((s) => s.segId)).toEqual(['c', 'a', 'b']);
  });
});

describe('exportNumbers', () => {
  it('numbers only the clips that are in the export, in order', () => {
    expect(exportNumbers([{ included: true }, { included: false }, { included: true }, { included: true }])).toEqual([1, null, 2, 3]);
  });
});
