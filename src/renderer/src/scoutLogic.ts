import type { ProjectPlay, TrimoutProject } from './projectModel';
import { getOrderedSelectedPlays } from './projectModel';
import { SCOUT_ROLE_BY_ID } from './scoutCatalog';

const RATING_RANK = {
  must_include: 0,
  strong: 1,
  good: 2,
  normal: 3,
} as const;

export interface ReelLengthGuidance {
  tone: 'building' | 'focused' | 'extended' | 'long';
  durationLabel: string;
  message: string;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function getReelLengthGuidance(durationSeconds: number): ReelLengthGuidance {
  const durationLabel = formatDuration(durationSeconds);
  if (durationSeconds < 150) {
    return { tone: 'building', durationLabel, message: '2:30-3:00 is a strong target. Up to 5:00 can still work.' };
  }
  if (durationSeconds <= 180) {
    return { tone: 'focused', durationLabel, message: 'Strong focused length. Add more only when it improves the story.' };
  }
  if (durationSeconds <= 300) {
    return { tone: 'extended', durationLabel, message: 'Still within the extended 5:00 range. Shorter is often stronger.' };
  }
  return { tone: 'long', durationLabel, message: 'Over 5:00. A tighter selection may be stronger, but you can still continue.' };
}

function compareStrength(a: ProjectPlay, b: ProjectPlay) {
  return RATING_RANK[a.rating] - RATING_RANK[b.rating] || a.order - b.order;
}

export function getSuggestedScoutPlayIds(project: TrimoutProject): string[] {
  const role = project.scoutRole ? SCOUT_ROLE_BY_ID.get(project.scoutRole) : null;
  const selected = getOrderedSelectedPlays(project);
  if (!role) return selected.map((play) => play.id);

  const remaining = new Set(selected.map((play) => play.id));
  const result: ProjectPlay[] = [];

  for (const actionType of role.openingPriority) {
    const best = selected
      .filter((play) => remaining.has(play.id) && play.actionType === actionType)
      .toSorted(compareStrength)[0];
    if (best) {
      result.push(best);
      remaining.delete(best.id);
    }
  }

  const recommendationRank = new Map(role.recommendedActions.map((actionType, index) => [actionType, index]));
  result.push(...selected
    .filter((play) => remaining.has(play.id))
    .toSorted((a, b) => {
      const category = (recommendationRank.get(a.actionType) ?? 999) - (recommendationRank.get(b.actionType) ?? 999);
      return category || compareStrength(a, b);
    }));

  return result.map((play) => play.id);
}

export function getOpeningCandidateIds(project: TrimoutProject): Set<string> {
  const role = project.scoutRole ? SCOUT_ROLE_BY_ID.get(project.scoutRole) : null;
  if (!role) return new Set();

  let duration = 0;
  const result = new Set<string>();
  for (const play of getOrderedSelectedPlays(project)) {
    if (duration < 30 && role.openingPriority.includes(play.actionType)) {
      result.add(play.id);
      duration += play.duration ?? 8;
    }
  }
  return result;
}
