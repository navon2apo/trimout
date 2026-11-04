import { nanoid } from 'nanoid';

export const TRIMOUT_PROJECT_VERSION = 1 as const;
export const TRIMOUT_PROJECT_EXTENSION = 'trimout';

export type ScoutRoleId = 'gk' | 'cb' | 'fb' | 'cm6' | 'cm8' | 'am10' | 'winger' | 'st';
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

export function normalizeScoutRoleId(value: unknown): ScoutRoleId | null {
  if (value === 'dm6') return 'cm6';
  if (value === 'striker') return 'st';
  return ['gk', 'cb', 'fb', 'cm6', 'cm8', 'am10', 'winger', 'st'].includes(String(value))
    ? value as ScoutRoleId
    : null;
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

/** The same cut of the same game: its source, start/end to the millisecond, action and player. */
function playSegmentKey({ sourcePath, startTime, endTime, actionType, playerName }: Pick<ProjectPlay, 'sourcePath' | 'startTime' | 'endTime' | 'actionType' | 'playerName'>): string | null {
  if (startTime == null || endTime == null) return null;
  return JSON.stringify([sourcePath, Math.round(startTime * 1000), Math.round(endTime * 1000), actionType, playerName]);
}

/** Plays by key, leaving out any key two plays share: a duplicated segment is two plays, not a copy. */
function playsByUniqueKey(plays: Pick<ProjectPlay, 'sourcePath' | 'startTime' | 'endTime' | 'actionType' | 'playerName'>[]) {
  const byKey = new Map<string, number>();
  const shared = new Set<string>();
  plays.forEach((play, index) => {
    const key = playSegmentKey(play);
    if (key == null) return;
    if (byKey.has(key)) shared.add(key);
    byKey.set(key, index);
  });
  for (const key of shared) byKey.delete(key);
  return byKey;
}

/** The review a merged play keeps: the selected copy's, else a rated one's, else the first copy's. */
function reviewOf(copies: ProjectPlay[]): ProjectPlay {
  return copies.find((play) => play.selected) ?? copies.find((play) => play.rating !== 'normal') ?? copies[0]!;
}

function withoutPlays(project: TrimoutProject, playIds: Set<string>): TrimoutProject {
  if (playIds.size === 0) return project;
  return {
    ...project,
    plays: project.plays.filter((play) => !playIds.has(play.id)),
    batches: project.batches
      .map((batch) => ({ ...batch, playIds: batch.playIds.filter((id) => !playIds.has(id)) }))
      .filter((batch) => batch.playIds.length > 0),
  };
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
  const firstOrder = project.plays.reduce((max, play) => Math.max(max, play.order + 1), 0);
  // Exporting the same game again replaces the plays it exports again: the new
  // file takes over the old play's review (selected, rating, order) instead of
  // landing next to it as a second copy.
  const fresh = exportedPlays.map((play, index): ProjectPlay => {
    const fileName = play.filePath.split(/[\\/]/).pop() || play.filePath;
    return {
      id: nanoid(),
      batchId,
      sourcePath,
      sourceName,
      filePath: play.filePath,
      fileName,
      actionType: String(play.actionType || 'free'),
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
  const earlierByKey = playsByUniqueKey(project.plays);
  const freshByKey = playsByUniqueKey(fresh);
  const replacedIds = new Set<string>();
  const plays = fresh.map((play): ProjectPlay => {
    const key = playSegmentKey(play);
    const earlierIndex = key != null && freshByKey.has(key) ? earlierByKey.get(key) : undefined;
    const earlier = earlierIndex == null ? undefined : project.plays[earlierIndex];
    if (!earlier) return play;
    replacedIds.add(earlier.id);
    return {
      ...play,
      selected: earlier.selected || play.selected,
      rating: earlier.rating !== 'normal' ? earlier.rating : play.rating,
      order: earlier.order,
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
  return withoutPlays({
    ...project,
    updatedAt: now,
    batches: [...project.batches, batch],
    plays: [...project.plays, ...plays],
  }, replacedIds);
}

/**
 * Projects saved before re-export replaced plays hold one copy per export of the
 * same cut, and the review stays on whichever copy the user marked — even after
 * its file is deleted, which stops the KICKO transfer. Keep one play per cut: the
 * newest copy whose file still exists, carrying the review of the copy that was
 * selected. A missing play with no copy is kept, so the transfer names it. Plays
 * from the same export are never copies of each other (a duplicated segment).
 */
export function consolidateProjectPlays(project: TrimoutProject, fileExists: (filePath: string) => boolean, now = new Date().toISOString()): TrimoutProject {
  const groups = new Map<string, ProjectPlay[]>();
  for (const play of project.plays) {
    const key = playSegmentKey(play);
    if (key != null) groups.set(key, [...(groups.get(key) ?? []), play]);
  }
  const dropIds = new Set<string>();
  const patches = new Map<string, Partial<ProjectPlay>>();
  for (const copies of groups.values()) {
    const oneCopyPerExport = new Set(copies.map((play) => play.batchId)).size === copies.length;
    const keeper = copies.length > 1 && oneCopyPerExport ? copies.findLast((play) => fileExists(play.filePath)) : undefined;
    if (keeper) {
      const reviewed = reviewOf(copies);
      for (const play of copies) if (play.id !== keeper.id) dropIds.add(play.id);
      patches.set(keeper.id, { selected: reviewed.selected, rating: reviewed.rating, order: reviewed.order });
    }
  }
  if (dropIds.size === 0) return project;
  return withoutPlays({
    ...project,
    updatedAt: now,
    plays: project.plays.map((play) => ({ ...play, ...patches.get(play.id) })),
  }, dropIds);
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
