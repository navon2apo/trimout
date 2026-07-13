// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';

import { getKickoProgressCopy } from './KickoBridgeDialog';

describe('KICKO bridge progress copy', () => {
  it('distinguishes local checks, upload, validation, and finalization', () => {
    expect(getKickoProgressCopy({ phase: 'preparing', current: 0, total: 3, fileName: 'one.mp4' })).toEqual({
      title: 'Checking play 1 of 3 locally',
      detail: 'Nothing is being uploaded yet.',
    });
    expect(getKickoProgressCopy({ phase: 'uploading', current: 1, total: 3, fileName: 'two.mp4' }).title).toBe('Uploading play 2 of 3');
    expect(getKickoProgressCopy({ phase: 'validating', current: 3, total: 3, fileName: 'three.mp4' }).title).toBe('Validated 3 of 3 plays');
    expect(getKickoProgressCopy({ phase: 'finalizing', current: 3, total: 3, fileName: '' }).title).toBe('Finishing your KICKO project');
  });
});
