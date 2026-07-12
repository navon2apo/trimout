import type { TrimoutProject } from './projectModel';
import { isTrimoutProject, normalizeScoutRoleId } from './projectModel';

const fs = window.require('fs/promises') as {
  readFile: (path: string, encoding: 'utf8') => Promise<string>;
  writeFile: (path: string, data: string, encoding: 'utf8') => Promise<void>;
  rename: (from: string, to: string) => Promise<void>;
  unlink: (path: string) => Promise<void>;
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
