import { describe, expect, it } from 'vitest';

import { addExportBatch, createTrimoutProject, updateProjectPlay } from './projectModel';
import { getOpeningCandidateIds, getReelLengthGuidance, getSuggestedScoutPlayIds } from './scoutLogic';

function makeWingerProject() {
  let project = createTrimoutProject({ name: 'Season', playerName: 'Alex', scoutRole: 'winger', now: '2026-01-01T00:00:00.000Z' });
  project = addExportBatch(project, {
    sourcePath: String.raw`C:\game.mp4`,
    now: '2026-01-01T00:01:00.000Z',
    exportedPlays: [
      { filePath: String.raw`C:\goal.mp4`, actionType: 'goal', actionLabel: 'Goal', favorite: true, duration: 18 },
      { filePath: String.raw`C:\cross.mp4`, actionType: 'crossing', actionLabel: 'Cross', favorite: true, duration: 12 },
      { filePath: String.raw`C:\dribble.mp4`, actionType: 'dribble', actionLabel: 'Dribble', favorite: true, duration: 10 },
      { filePath: String.raw`C:\assist.mp4`, actionType: 'assist', actionLabel: 'Assist', favorite: true, duration: 8 },
    ],
  });
  return updateProjectPlay(project, project.plays[2]!.id, { rating: 'must_include' });
}

describe('Scout ordering', () => {
  it('puts one strong example from each opening category before consistency plays', () => {
    const project = makeWingerProject();
    const ordered = getSuggestedScoutPlayIds(project).map((id) => project.plays.find((play) => play.id === id)!.actionType);
    expect(ordered).toEqual(['dribble', 'crossing', 'goal', 'assist']);
  });

  it('marks opening candidates only until the opening reaches about 30 seconds', () => {
    let project = makeWingerProject();
    const orderedIds = getSuggestedScoutPlayIds(project);
    project = { ...project, plays: project.plays.map((play) => ({ ...play, order: orderedIds.indexOf(play.id) })) };
    const candidateIds = getOpeningCandidateIds(project);
    expect([...candidateIds]).toEqual([orderedIds[0], orderedIds[1], orderedIds[2]]);
  });
});

describe('Reel length guidance', () => {
  it.each([
    [149, 'building'],
    [150, 'focused'],
    [180, 'focused'],
    [181, 'extended'],
    [300, 'extended'],
    [301, 'long'],
  ] as const)('keeps %i seconds advisory with the %s tone', (duration, tone) => {
    expect(getReelLengthGuidance(duration).tone).toBe(tone);
  });

  it('never describes a long reel as blocked', () => {
    expect(getReelLengthGuidance(360).message).toContain('you can still continue');
  });
});
