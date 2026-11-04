import type { TrimoutProject } from './projectModel';
import { consolidateProjectPlays, isTrimoutProject, normalizeScoutRoleId } from './projectModel';

const fs = window.require('fs/promises') as {
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  writeFile: (path: string, data: string, encoding: 'utf8') => Promise<void>;
  rename: (from: string, to: string) => Promise<void>;
  unlink: (path: string) => Promise<void>;
  access: (path: string) => Promise<void>;
};

export async function loadTrimoutProject(projectPath: string): Promise<TrimoutProject> {
  const parsed: unknown = JSON.parse(await fs.readFile(projectPath, 'utf8'));
  if (!isTrimoutProject(parsed)) throw new Error('This is not a valid KICKO TrimOut project file.');
  return { ...parsed, scoutRole: normalizeScoutRoleId(parsed.scoutRole) };
}

export async function saveTrimoutProject(projectPath: string, project: TrimoutProject): Promise<void> {
  const tempPath = `${projectPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(project, null, 2), 'utf8');
  try {
    await fs.rename(tempPath, projectPath);
  } catch {
    try { await fs.unlink(projectPath); } catch { /* first save */ }
    await fs.rename(tempPath, projectPath);
  }
}

/** Folds re-exported copies of a play into one that still has its file, and saves if that changed anything. */
export async function repairTrimoutProjectFiles(projectPath: string, project: TrimoutProject): Promise<TrimoutProject> {
  const missing = new Set<string>();
  await Promise.all(project.plays.map(async ({ filePath }) => {
    try { await fs.access(filePath); } catch { missing.add(filePath); }
  }));
  const repaired = consolidateProjectPlays(project, (filePath) => !missing.has(filePath));
  if (repaired !== project) await saveTrimoutProject(projectPath, repaired);
  return repaired;
}
