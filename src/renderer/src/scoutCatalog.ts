import type { ScoutRoleId } from './projectModel';

export interface ScoutAction {
  id: string;
  label: string;
  helper: string;
  color: string;
}

export interface ScoutRole {
  id: ScoutRoleId;
  label: string;
  shortLabel: string;
  recommended: { actionType: string; target: number }[];
}

export const SCOUT_ACTIONS: ScoutAction[] = [
  { id: 'goal', label: 'Goal', helper: 'Quality finish', color: '#d2ff00' },
  { id: 'assist', label: 'Assist', helper: 'Creates a chance', color: '#7ee8ff' },
  { id: 'free_kick', label: 'Free kick', helper: 'Threat on goal', color: '#fbbf24' },
  { id: 'header', label: 'Header', helper: 'Finish or aerial duel', color: '#fb7185' },
  { id: 'deep_pass', label: 'Progressive pass', helper: 'Breaks a line', color: '#7ee8ff' },
  { id: 'reception_pressure', label: 'Under pressure', helper: 'First touch and composure', color: '#a5f3fc' },
  { id: 'dribble', label: 'Dribble / 1v1', helper: 'Beats a defender', color: '#38bdf8' },
  { id: 'crossing', label: 'Cross', helper: 'Delivery from the wing', color: '#fb923c' },
  { id: 'hold_up_play', label: 'Hold-up play', helper: 'Protects and connects', color: '#fb7185' },
  { id: 'off_ball', label: 'Off-ball run', helper: 'Creates an option', color: '#cbd5e1' },
  { id: 'attacking_join', label: 'Late run', helper: 'Joins at the right time', color: '#38bdf8' },
  { id: 'tackle', label: 'Tackle', helper: 'Wins the ball', color: '#fb923c' },
  { id: 'one_on_one_def', label: '1v1 defense', helper: 'Controls the lane', color: '#fb923c' },
  { id: 'block', label: 'Block', helper: 'Stops a shot', color: '#fb7185' },
  { id: 'interception', label: 'Interception', helper: 'Reads the pass', color: '#fb923c' },
  { id: 'cover', label: 'Defensive cover', helper: 'Protects dangerous space', color: '#cbd5e1' },
  { id: 'recovery_run', label: 'Recovery run', helper: 'Tracks back quickly', color: '#cbd5e1' },
  { id: 'long_shot', label: 'Long shot', helper: 'Threat from distance', color: '#fbbf24' },
  { id: 'counter_press', label: 'Counter-press', helper: 'Reacts after losing the ball', color: '#fb923c' },
  { id: 'shot_stopping', label: 'Save', helper: 'Shot stopping', color: '#34d399' },
  { id: 'keeper_one_on_one', label: '1v1 save', helper: 'Closes the striker', color: '#34d399' },
  { id: 'high_ball', label: 'High ball', helper: 'Controls the area', color: '#a5f3fc' },
  { id: 'distribution', label: 'Distribution', helper: 'Starts the attack', color: '#a5f3fc' },
  { id: 'free', label: 'Free play', helper: 'Does not fit a category', color: '#94a3b8' },
];

export const SCOUT_ACTION_BY_ID = new Map(SCOUT_ACTIONS.map((action) => [action.id, action]));

function targets(entries: [string, number][]) {
  return entries.map(([actionType, target]) => ({ actionType, target }));
}

export const SCOUT_ROLES: ScoutRole[] = [
  { id: 'gk', label: 'Goalkeeper', shortLabel: 'GK', recommended: targets([['shot_stopping', 3], ['keeper_one_on_one', 2], ['high_ball', 2], ['distribution', 2]]) },
  { id: 'cb', label: 'Center back', shortLabel: 'CB', recommended: targets([['interception', 2], ['one_on_one_def', 2], ['header', 2], ['deep_pass', 2], ['cover', 2]]) },
  { id: 'fb', label: 'Fullback / Wingback', shortLabel: 'FB', recommended: targets([['one_on_one_def', 2], ['recovery_run', 2], ['crossing', 2], ['off_ball', 2]]) },
  { id: 'dm6', label: 'Holding midfielder / 6', shortLabel: 'DM6', recommended: targets([['tackle', 2], ['cover', 2], ['reception_pressure', 2], ['deep_pass', 2], ['interception', 1]]) },
  { id: 'cm8', label: 'Box-to-box midfielder / 8', shortLabel: 'CM8', recommended: targets([['reception_pressure', 3], ['deep_pass', 2], ['attacking_join', 2], ['tackle', 1], ['off_ball', 1]]) },
  { id: 'am10', label: 'Attacking midfielder / 10', shortLabel: 'AM10', recommended: targets([['assist', 2], ['deep_pass', 3], ['reception_pressure', 2], ['dribble', 2], ['off_ball', 1]]) },
  { id: 'winger', label: 'Winger', shortLabel: 'WG', recommended: targets([['dribble', 3], ['crossing', 2], ['off_ball', 2], ['goal', 2], ['assist', 2]]) },
  { id: 'striker', label: 'Striker', shortLabel: 'ST', recommended: targets([['goal', 3], ['off_ball', 3], ['hold_up_play', 2], ['header', 2], ['counter_press', 1]]) },
];

export const SCOUT_ROLE_BY_ID = new Map(SCOUT_ROLES.map((role) => [role.id, role]));

export function getActionLabel(actionType: string): string {
  return SCOUT_ACTION_BY_ID.get(actionType)?.label ?? actionType.replaceAll('_', ' ');
}
