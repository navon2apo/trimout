import { describe, it, expect } from 'vitest';
import { upsertRecentProject, removeRecentProject, MAX_RECENT_PROJECTS, projectTitle, type RecentProject } from './recentProjects';

const entry = (n: number, extra: Partial<RecentProject> = {}): RecentProject => ({
  projectPath: `D:\\v\\game${n}.mp4.proj.llc`, mediaPath: `D:\\v\\game${n}.mp4`, clipCount: n, updatedAt: n, playerTime: 0, ...extra,
});

describe('recent projects list', () => {
  it('puts the newest first and does not duplicate the same project', () => {
    let list: RecentProject[] = [];
    list = upsertRecentProject(list, entry(1));
    list = upsertRecentProject(list, entry(2));
    list = upsertRecentProject(list, entry(1, { clipCount: 9, updatedAt: 10 }));
    expect(list.map((e) => e.mediaPath)).toEqual([String.raw`D:\v\game1.mp4`, String.raw`D:\v\game2.mp4`]);
    expect(list[0]?.clipCount).toBe(9);
  });

  it('treats paths with different letter case as the same file (Windows)', () => {
    const list = upsertRecentProject([entry(1)], entry(1, { mediaPath: String.raw`d:\V\GAME1.mp4`, projectPath: String.raw`d:\V\GAME1.mp4.proj.llc` }));
    expect(list).toHaveLength(1);
  });

  it('keeps only the latest few', () => {
    let list: RecentProject[] = [];
    for (let i = 1; i <= MAX_RECENT_PROJECTS + 5; i += 1) list = upsertRecentProject(list, entry(i));
    expect(list).toHaveLength(MAX_RECENT_PROJECTS);
    expect(list[0]?.clipCount).toBe(MAX_RECENT_PROJECTS + 5);
  });

  it('removes one project', () => {
    const list = removeRecentProject([entry(1), entry(2)], entry(1).mediaPath);
    expect(list.map((e) => e.clipCount)).toEqual([2]);
  });

  it('titles a project by its video name without the extension', () => {
    expect(projectTitle(entry(1, { mediaPath: String.raw`D:\v\Hapoel Jerusalem vs X.mp4` }))).toBe('Hapoel Jerusalem vs X');
    expect(projectTitle(entry(1, { mediaPath: '/home/a/game.final.mov' }))).toBe('game.final');
  });
});
