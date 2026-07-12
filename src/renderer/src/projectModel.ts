import { nanoid } from 'nanoid';

export const TRIMOUT_PROJECT_VERSION = 1 as const;
export const TRIMOUT_PROJECT_EXTENSION = 'trimout';

export type ScoutRoleId = 'gk' | 'cb' | 'fb' | 'dm6' | 'cm8' | 'am10' | 'winger' | 'striker';
export type ProjectPlayRating = 'normal' | 'good' | 'strong' | 'must_include';

export interface ProjectPlay {
  id: string;
  batchId: string;
  sourcePath: string;
  sourceName: string;
  filePath: string;
  fileName: string;
  actionType: string;
  actionLabel: string;
  playerName: string | null;
  startTime: number | null;
  endTime: number | null;
  duration: number | null;
  favorite: boolean;
  uncertain: boolean;
  rating: ProjectPlayRating;
  selected: boolean;
  order: number;
  createdAt: string;
}

export interface ProjectBatch {
  id: string;
  sourcePath: string;
  sourceName: string;
  playIds: string[];
  combinedFilePath: string | null;
  exportedAt: string;
}

export interface TrimoutProject {
  version: typeof TRIMOUT_PROJECT_VERSION;
  id: string;
  name: string;
  playerName: string;
  scoutRole: ScoutRoleId | null;
  createdAt: string;
  updatedAt: string;
  batches: ProjectBatch[];
  plays: ProjectPlay[];
}

export interface ExportedPlayInput {
  filePath: string;
  actionType?: string | null | undefined;
  actionLabel?: string | null | undefined;
  playerName?: string | null | undefined;
  startTime?: number | null | undefined;
  endTime?: number | null | undefined;
  duration?: number | null | undefined;
  favorite?: boolean | undefined;
  uncertain?: boolean | undefined;
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function createTrimoutProject({ name, playerName, scoutRole = null, now = new Date().toISOString() }: {
  name: string;
  playerName: string;
  scoutRole?: ScoutRoleId | null;
  now?: string;
}): TrimoutProject {
  return {
    version: TRIMOUT_PROJECT_VERSION,
    id: nanoid(),
    name: name.trim() || 'Untitled project',
    playerName: playerName.trim(),
    scoutRole,
    createdAt: now,
    updatedAt: now,
    batches: [],
    plays: [],
  };
}

export function isTrimoutProject(value: unknown): value is TrimoutProject {
  if (value == null || typeof value !== 'object') return false;
  const project = value as Partial<TrimoutProject>;
  return project.version === TRIMOUT_PROJECT_VERSION
    && typeof project.id === 'string'
    && typeof project.name === 'string'
    && typeof project.playerName === 'string'
    && (project.scoutRole == null || typeof project.scoutRole === 'string')
    && typeof project.createdAt === 'string'
    && typeof project.updatedAt === 'string'
    && Array.isArray(project.batches)
    && Array.isArray(project.plays);
}

export function addExportBatch(project: TrimoutProject, {
  sourcePath,
  exportedPlays,
  combinedFilePath = null,
  now = new Date().toISOString(),
}: {
  sourcePath: string;
  exportedPlays: ExportedPlayInput[];
  combinedFilePath?: string | null;
  now?: string;
}): TrimoutProject {
  const batchId = nanoid();
  const sourceName = sourcePath.split(/[\\/]/).pop() || sourcePath;
  const firstOrder = project.plays.length;
  const plays = exportedPlays.map((play, index): ProjectPlay => {
    const fileName = play.filePath.split(/[\\/]/).pop() || play.filePath;
    const actionType = String(play.actionType || 'free');
    return {
      id: nanoid(),
      batchId,
      sourcePath,
      sourceName,
      filePath: play.filePath,
      fileName,
      actionType,
      actionLabel: String(play.actionLabel || play.actionType || 'Free play'),
      playerName: play.playerName?.trim() || project.playerName || null,
      startTime: finiteOrNull(play.startTime),
      endTime: finiteOrNull(play.endTime),
      duration: finiteOrNull(play.duration),
      favorite: Boolean(play.favorite),
      uncertain: Boolean(play.uncertain),
      rating: play.favorite ? 'strong' : 'normal',
      selected: Boolean(play.favorite),
      order: firstOrder + index,
      createdAt: now,
    };
  });
  const batch: ProjectBatch = {
    id: batchId,
    sourcePath,
    sourceName,
    playIds: plays.map((play) => play.id),
    combinedFilePath,
    exportedAt: now,
  };
  return {
    ...project,
    updatedAt: now,
    batches: [...project.batches, batch],
    plays: [...project.plays, ...plays],
  };
}

export function updateProjectPlay(project: TrimoutProject, playId: string, patch: Partial<Pick<ProjectPlay, 'selected' | 'rating' | 'actionType' | 'actionLabel'>>, now = new Date().toISOString()): TrimoutProject {
  return {
    ...project,
    updatedAt: now,
    plays: project.plays.map((play) => (play.id === playId ? { ...play, ...patch } : play)),
  };
}

export function reorderProjectPlays(project: TrimoutProject, orderedPlayIds: string[], now = new Date().toISOString()): TrimoutProject {
  const orderById = new Map(orderedPlayIds.map((id, index) => [id, index]));
  const selectedCount = orderedPlayIds.length;
  return {
    ...project,
    updatedAt: now,
    plays: project.plays.map((play) => ({
      ...play,
      order: orderById.get(play.id) ?? selectedCount + play.order,
    })),
  };
}

export function getOrderedSelectedPlays(project: TrimoutProject): ProjectPlay[] {
  return project.plays.filter((play) => play.selected).toSorted((a, b) => a.order - b.order);
}

export function getProjectActionCounts(project: TrimoutProject): Record<string, number> {
  return project.plays.reduce<Record<string, number>>((counts, play) => ({
    ...counts,
    [play.actionType]: (counts[play.actionType] ?? 0) + 1,
  }), {});
}
