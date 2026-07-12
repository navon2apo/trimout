import { describe, expect, it } from 'vitest';

import { createTrimoutProject } from './projectModel';
import { buildProjectIdentity, buildProjectSavePayload } from './kickoBridge';

describe('kickoBridge payload', () => {
  it('preserves the global Scout role and player identity', () => {
    const project = createTrimoutProject({ name: 'Alex 2026', playerName: 'Alex', scoutRole: 'cm8' });
    expect(buildProjectIdentity(project)).toMatchObject({
      title: 'Alex 2026',
      playerData: { name: 'Alex', position: 'Box-to-box midfielder / 8' },
      settings: { appMode: 'professional', scoutMode: { enabled: true, position: 'cm8' }, source: 'kicko-trimout' },
    });
  });

  it('preserves snake-case identity fields when adding plays to an existing KICKO project', () => {
    const project = createTrimoutProject({ name: 'Local project', playerName: 'Local player', scoutRole: 'winger' });
    const existingClip = { clipKey: 'existing' };
    const importedClip = { clipKey: 'imported' };
    expect(buildProjectSavePayload(project, {
      title: 'Existing project',
      player_data: { name: 'Cloud player', team: 'KICKO FC' },
      settings: { musicTrack: 'uplifting' },
      clips: [existingClip],
    }, [importedClip])).toMatchObject({
      title: 'Existing project',
      playerData: { name: 'Cloud player', team: 'KICKO FC', position: 'Winger' },
      settings: { source: 'kicko-trimout', musicTrack: 'uplifting' },
      clips: [existingClip, importedClip],
    });
  });
});
