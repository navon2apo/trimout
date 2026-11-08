import type { RecentProject } from '../../../common/types';


export const MAX_RECENT_PROJECTS = 8;

// Windows paths are not case sensitive
const sameFile = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export const upsertRecentProject = (list: RecentProject[], entry: RecentProject) => [
  entry,
  ...list.filter((e) => !sameFile(e.mediaPath, entry.mediaPath)),
].slice(0, MAX_RECENT_PROJECTS);

export const removeRecentProject = (list: RecentProject[], mediaPath: string) => list.filter((e) => !sameFile(e.mediaPath, mediaPath));

export const projectTitle = (p: Pick<RecentProject, 'mediaPath'>) => {
  const name = p.mediaPath.split(/[\\/]/).pop() ?? p.mediaPath;
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
};

export { type RecentProject } from '../../../common/types';
