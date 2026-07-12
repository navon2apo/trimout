import type { ProjectPlay, TrimoutProject } from './projectModel';
import { getOrderedSelectedPlays } from './projectModel';
import { SCOUT_ROLE_BY_ID } from './scoutCatalog';

const RATING_RANK = {
  must_include: 0,
  strong: 1,
  good: 2,
  normal: 3,
} as const;

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
