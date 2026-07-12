import type { ScoutRoleId } from './projectModel';
import catalogData from './scoutCatalogData';

export interface ScoutIqGuidance {
  hint: string;
  detail: string;
}

export interface ScoutAction {
  id: string;
  label: string;
  helper: string;
  color: string;
  iqGuidance: ScoutIqGuidance;
}

export interface ScoutRole {
  id: ScoutRoleId;
  label: string;
  shortLabel: string;
  openingPriority: string[];
  recommendedActions: string[];
  consistencyTargets: Record<string, number>;
  avoidOveruse: string[];
  consistencyTips: string[];
  iqGuidance: Record<string, ScoutIqGuidance>;
}

export interface ScoutPhaseContext {
  phase: 'opening' | 'consistency';
  title: string;
  description: string;
  recommendedActionTypes: string[];
  missingActionTypes: string[];
  overuseWarning: string | null;
}

export const SCOUT_CATALOG_VERSION = catalogData.version;

export const SCOUT_ACTIONS: ScoutAction[] = catalogData.actions.map((action) => ({
  ...action,
  iqGuidance: { ...action.iqGuidance },
}));

export const SCOUT_ACTION_BY_ID = new Map(SCOUT_ACTIONS.map((action) => [action.id, action]));

export const SCOUT_ROLES: ScoutRole[] = catalogData.roles.map((role) => ({
  ...role,
  id: role.id as ScoutRoleId,
  openingPriority: [...role.openingPriority],
  recommendedActions: [...role.recommendedActions],
  consistencyTargets: { ...role.consistencyTargets },
  avoidOveruse: [...role.avoidOveruse],
  consistencyTips: [...role.consistencyTips],
  iqGuidance: { ...role.iqGuidance },
}));

export const SCOUT_ROLE_BY_ID = new Map(SCOUT_ROLES.map((role) => [role.id, role]));

export function getActionLabel(actionType: string): string {
  return SCOUT_ACTION_BY_ID.get(actionType)?.label ?? actionType.replaceAll('_', ' ');
}

export function getScoutIqGuidance(role: ScoutRole | null, actionType: string): ScoutIqGuidance {
  return role?.iqGuidance[actionType]
    ?? SCOUT_ACTION_BY_ID.get(actionType)?.iqGuidance
    ?? SCOUT_ACTION_BY_ID.get('free')!.iqGuidance;
}

function getOveruseWarning(role: ScoutRole, counts: Record<string, number>): string | null {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total < 3) return null;
  const overused = role.avoidOveruse.find((actionType) => (counts[actionType] ?? 0) / total >= 0.5);
  if (!overused) return null;
  return `Most collected plays are ${getActionLabel(overused)}. Add another side of the player's game.`;
}

export function getScoutPhaseContext(role: ScoutRole, counts: Record<string, number>): ScoutPhaseContext {
  const missingOpening = role.openingPriority.filter((actionType) => (counts[actionType] ?? 0) === 0);
  const phase = missingOpening.length > 0 ? 'opening' : 'consistency';
  const missingConsistency = role.recommendedActions.filter((actionType) => {
    const target = role.consistencyTargets[actionType];
    return target != null && (counts[actionType] ?? 0) < target;
  });
  const recommendedActionTypes = phase === 'opening'
    ? [...missingOpening, ...role.openingPriority.filter((actionType) => !missingOpening.includes(actionType))]
    : [...missingConsistency, ...role.recommendedActions.filter((actionType) => !missingConsistency.includes(actionType))];

  return {
    phase,
    title: phase === 'opening' ? 'Build the strongest opening' : 'Now prove consistency & Soccer IQ',
    description: phase === 'opening'
      ? 'Collect each opening type once. Together, these become the first ~30 seconds.'
      : 'Add repeated evidence and keep the decision before and after each action.',
    recommendedActionTypes,
    missingActionTypes: phase === 'opening' ? missingOpening : missingConsistency,
    overuseWarning: getOveruseWarning(role, counts),
  };
}
