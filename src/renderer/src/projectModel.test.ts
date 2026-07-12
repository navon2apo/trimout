import { describe, expect, it } from 'vitest';

import {
  addExportBatch,
  createTrimoutProject,
  getOrderedSelectedPlays,
  getProjectActionCounts,
  isTrimoutProject,
  normalizeScoutRoleId,
  reorderProjectPlays,
  updateProjectPlay,
} from './projectModel';

describe('projectModel', () => {
  it('creates and validates a versioned project', () => {
    const project = createTrimoutProject({ name: '  Season 2026  ', playerName: ' Alex ' });
    expect(project.name).toBe('Season 2026');
    expect(project.playerName).toBe('Alex');
    expect(isTrimoutProject(project)).toBe(true);
  });

  it('migrates legacy Scout role ids to KICKO canonical ids', () => {
    expect(normalizeScoutRoleId('dm6')).toBe('cm6');
    expect(normalizeScoutRoleId('striker')).toBe('st');
    expect(normalizeScoutRoleId('winger')).toBe('winger');
  });

  it('adds exported plays as an independent batch', () => {
    const project = createTrimoutProject({ name: 'Season', playerName: 'Alex', now: '2026-01-01T00:00:00.000Z' });
    const next = addExportBatch(project, {
      sourcePath: String.raw`C:\games\game-1.mp4`,
      now: '2026-01-02T00:00:00.000Z',
      exportedPlays: [
        { filePath: String.raw`C:\exports\goal.mp4`, actionType: 'goal', duration: 8, favorite: true },
        { filePath: String.raw`C:\exports\pass.mp4`, actionType: 'deep_pass', duration: 6 },
      ],
    });
    expect(next.batches).toHaveLength(1);
    expect(next.plays).toHaveLength(2);
    expect(next.plays[0]).toMatchObject({ sourceName: 'game-1.mp4', selected: true, rating: 'strong' });
    expect(getProjectActionCounts(next)).toEqual({ goal: 1, deep_pass: 1 });
  });

  it('updates selection and keeps explicit review order', () => {
    let project = addExportBatch(createTrimoutProject({ name: 'Season', playerName: '' }), {
      sourcePath: '/games/game.mp4',
      exportedPlays: [
        { filePath: '/out/a.mp4', actionType: 'goal' },
        { filePath: '/out/b.mp4', actionType: 'assist' },
      ],
    });
    const [first, second] = project.plays;
    expect(first && second).toBeTruthy();
    project = updateProjectPlay(project, first!.id, { selected: true });
    project = updateProjectPlay(project, second!.id, { selected: true });
    project = reorderProjectPlays(project, [second!.id, first!.id]);
    expect(getOrderedSelectedPlays(project).map((play) => play.actionType)).toEqual(['assist', 'goal']);
  });
});
