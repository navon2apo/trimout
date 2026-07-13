// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';

import {
  getKickoDestinationCapacity,
  getKickoProgressCopy,
  getKickoProjectOptionLabel,
} from './KickoBridgeDialog';

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

  it('blocks a destination that cannot fit every selected play', () => {
    expect(getKickoDestinationCapacity({
      destination: 'project-1',
      projects: [{ id: 'project-1', title: 'Season', clipCount: 6 }],
      clipsPerProject: 12,
      selectedCount: 7,
    })).toEqual({ exceeded: true, existingClipCount: 6, remaining: 6 });
  });

  it('shows current and maximum project capacity when KICKO supplies a plan limit', () => {
    const project = { id: 'project-1', title: 'Season', clipCount: 6 };
    expect(getKickoProjectOptionLabel(project, 12)).toBe('Season (6 of 12 plays)');
    expect(getKickoProjectOptionLabel(project, null)).toBe('Season (6 plays)');
  });
});
