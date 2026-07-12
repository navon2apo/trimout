import { describe, expect, it } from 'vitest';

import { SCOUT_ACTION_BY_ID, SCOUT_ROLES, getScoutIqGuidance, getScoutPhaseContext } from './scoutCatalog';

describe('KICKO Scout catalog snapshot', () => {
  it('uses the canonical role and action ids expected by KICKO', () => {
    expect(SCOUT_ROLES.map((role) => role.id)).toEqual(['gk', 'cb', 'fb', 'cm6', 'cm8', 'am10', 'winger', 'st']);
    expect(SCOUT_ACTION_BY_ID.has('gk_punch')).toBe(true);
  });

  it('moves from the strong opening to consistency only after every opening type is represented', () => {
    const winger = SCOUT_ROLES.find((role) => role.id === 'winger')!;
    const opening = getScoutPhaseContext(winger, { dribble: 1, crossing: 1 });
    expect(opening.phase).toBe('opening');
    expect(opening.missingActionTypes).toEqual(['off_ball', 'goal']);

    const consistency = getScoutPhaseContext(winger, { dribble: 1, crossing: 1, off_ball: 1, goal: 1 });
    expect(consistency.phase).toBe('consistency');
    expect(consistency.missingActionTypes).toContain('assist');
  });

  it('uses role-specific Soccer IQ guidance when KICKO defines it', () => {
    const centerBack = SCOUT_ROLES.find((role) => role.id === 'cb')!;
    expect(getScoutIqGuidance(centerBack, 'tackle').hint).toContain('timing before the ball is won');
  });
});
