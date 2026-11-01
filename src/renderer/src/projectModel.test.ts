import { describe, expect, it } from 'vitest';

import {
  addExportBatch,
  consolidateProjectPlays,
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

describe('re-exporting the same game', () => {
  const game = String.raw`C:\games\game.mp4`;
  const firstExport = (dir: string) => [
    { filePath: `${dir}/a.mp4`, actionType: 'goal', startTime: 10, endTime: 18 },
    { filePath: `${dir}/b.mp4`, actionType: 'tackle', startTime: 40, endTime: 46 },
  ];

  it('replaces the plays it exports again instead of adding a second copy', () => {
    let project = addExportBatch(createTrimoutProject({ name: 'Game', playerName: 'Dean' }), { sourcePath: game, exportedPlays: firstExport('15-23') });
    const [a] = project.plays;
    project = updateProjectPlay(project, a!.id, { selected: true, rating: 'must_include' });
    project = addExportBatch(project, { sourcePath: game, exportedPlays: firstExport('15-26') });
    expect(project.plays).toHaveLength(2);
    expect(project.batches).toHaveLength(1);
    expect(project.plays.map((play) => play.filePath)).toEqual(['15-26/a.mp4', '15-26/b.mp4']);
    expect(getOrderedSelectedPlays(project)).toMatchObject([{ filePath: '15-26/a.mp4', rating: 'must_include' }]);
  });

  it('keeps plays from the same game that were not exported again', () => {
    let project = addExportBatch(createTrimoutProject({ name: 'Game', playerName: '' }), { sourcePath: game, exportedPlays: firstExport('one') });
    project = addExportBatch(project, { sourcePath: game, exportedPlays: [{ filePath: 'two/c.mp4', startTime: 70, endTime: 75 }] });
    expect(project.plays.map((play) => play.filePath)).toEqual(['one/a.mp4', 'one/b.mp4', 'two/c.mp4']);
    expect(project.batches).toHaveLength(2);
  });

  it('does not merge the same times from a different game', () => {
    let project = addExportBatch(createTrimoutProject({ name: 'Season', playerName: '' }), { sourcePath: game, exportedPlays: firstExport('one') });
    project = addExportBatch(project, { sourcePath: String.raw`C:\games\other.mp4`, exportedPlays: firstExport('two') });
    expect(project.plays).toHaveLength(4);
  });
});

describe('consolidateProjectPlays', () => {
  const game = String.raw`C:\games\game.mp4`;
  // The owner's project, 2026-11-01: three exports of the same 2 plays, the
  // selection on the first export, whose folder was then deleted.
  function threeExports() {
    let project = createTrimoutProject({ name: 'Game', playerName: '' });
    for (const dir of ['15-23', '15-25', '15-26']) {
      const before = project;
      project = addExportBatch(project, { sourcePath: game,
        exportedPlays: [
          { filePath: `${dir}/a.mp4`, startTime: 10, endTime: 18 },
          { filePath: `${dir}/b.mp4`, startTime: 40, endTime: 46 },
        ] });
      // Simulate the old app, which appended every export as new plays.
      project = { ...project, plays: [...before.plays, ...project.plays.filter((play) => !before.plays.some((old) => old.id === play.id))], batches: [...before.batches, ...project.batches.filter((batch) => !before.batches.some((old) => old.id === batch.id))] };
    }
    for (const play of project.plays.filter((p) => p.filePath.startsWith('15-23'))) {
      project = updateProjectPlay(project, play.id, { selected: true, rating: 'good' });
    }
    return project;
  }

  it('moves the selection off a deleted file to the newest copy that exists, and drops the copies', () => {
    const project = threeExports();
    expect(project.plays).toHaveLength(6);
    const next = consolidateProjectPlays(project, (path) => !path.startsWith('15-23'));
    expect(next.plays.map((play) => play.filePath)).toEqual(['15-26/a.mp4', '15-26/b.mp4']);
    expect(getOrderedSelectedPlays(next).map((play) => [play.filePath, play.rating])).toEqual([['15-26/a.mp4', 'good'], ['15-26/b.mp4', 'good']]);
    expect(next.batches.map((batch) => batch.playIds.length)).toEqual([2]);
  });

  it('returns the same project when nothing changes', () => {
    const project = addExportBatch(createTrimoutProject({ name: 'Game', playerName: '' }), { sourcePath: game, exportedPlays: [{ filePath: 'x.mp4', startTime: 1, endTime: 2 }] });
    expect(consolidateProjectPlays(project, () => true)).toBe(project);
  });

  it('keeps a missing play that has no copy, so the transfer can say which clip is missing', () => {
    const project = addExportBatch(createTrimoutProject({ name: 'Game', playerName: '' }), { sourcePath: game, exportedPlays: [{ filePath: 'gone.mp4', startTime: 1, endTime: 2, favorite: true }] });
    expect(consolidateProjectPlays(project, () => false)).toBe(project);
  });
});

describe('a duplicated segment is two plays, not a copy (review 2026-11-01)', () => {
  const game = '/games/game.mp4';
  const twin = (dir: string) => [
    { filePath: `${dir}/a.mp4`, actionType: 'goal', startTime: 10, endTime: 18 },
    { filePath: `${dir}/b.mp4`, actionType: 'goal', startTime: 10, endTime: 18 },
  ];

  it('consolidation never folds two plays of one export', () => {
    const project = addExportBatch(createTrimoutProject({ name: 'Game', playerName: '' }), { sourcePath: game, exportedPlays: twin('one') });
    expect(consolidateProjectPlays(project, () => true)).toBe(project);
  });

  it('re-exporting a duplicated segment adds it rather than guessing which review goes where', () => {
    let project = addExportBatch(createTrimoutProject({ name: 'Game', playerName: '' }), { sourcePath: game, exportedPlays: twin('one') });
    project = addExportBatch(project, { sourcePath: game, exportedPlays: twin('two') });
    expect(project.plays).toHaveLength(4);
  });

  it('a different action at the same times is a different play', () => {
    let project = addExportBatch(createTrimoutProject({ name: 'Game', playerName: '' }), { sourcePath: game, exportedPlays: [{ filePath: 'one/a.mp4', actionType: 'goal', startTime: 10, endTime: 18 }] });
    project = addExportBatch(project, { sourcePath: game, exportedPlays: [{ filePath: 'two/a.mp4', actionType: 'tackle', startTime: 10, endTime: 18 }] });
    expect(project.plays).toHaveLength(2);
  });
});

describe('the review survives a merge (review 2026-11-01)', () => {
  const game = '/games/game.mp4';
  const one = (dir: string, favorite = false) => [{ filePath: `${dir}/a.mp4`, actionType: 'goal', startTime: 10, endTime: 18, favorite }];

  it('keeps a rating given to an unselected copy', () => {
    let project = addExportBatch(createTrimoutProject({ name: 'Game', playerName: '' }), { sourcePath: game, exportedPlays: one('one') });
    const before = project;
    project = addExportBatch(project, { sourcePath: game, exportedPlays: one('two') });
    // An old-app project: both copies kept, the first one rated but not selected.
    project = { ...project, plays: [...before.plays, ...project.plays], batches: [...before.batches, ...project.batches] };
    project = updateProjectPlay(project, before.plays[0]!.id, { rating: 'good' });
    const next = consolidateProjectPlays(project, () => true);
    expect(next.plays.map((play) => [play.filePath, play.rating, play.selected])).toEqual([['two/a.mp4', 'good', false]]);
  });

  it('a play starred on re-export is selected, as a new favourite always was', () => {
    let project = addExportBatch(createTrimoutProject({ name: 'Game', playerName: '' }), { sourcePath: game, exportedPlays: one('one') });
    project = addExportBatch(project, { sourcePath: game, exportedPlays: one('two', true) });
    expect(project.plays.map((play) => [play.filePath, play.rating, play.selected])).toEqual([['two/a.mp4', 'strong', true]]);
  });
});
