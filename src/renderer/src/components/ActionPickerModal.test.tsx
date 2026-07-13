import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SCOUT_ROLES, getScoutPhaseContext } from '../scoutCatalog';
import ActionPickerModal from './ActionPickerModal';

describe('ActionPickerModal Scout progress', () => {
  it('shows the collected count and advisory guide target on recommended actions', () => {
    const role = SCOUT_ROLES.find((candidate) => candidate.id === 'winger')!;
    const actionCounts = { dribble: 2, crossing: 1 };
    const html = renderToStaticMarkup(
      <ActionPickerModal
        visible
        playerName="Alex"
        clipDurationSec={10}
        scoutRole={role}
        scoutContext={getScoutPhaseContext(role, actionCounts)}
        actionCounts={actionCounts}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(html).toContain('2 collected');
    expect(html).toContain('1 collected');
    expect(html).toContain('0 collected');
    expect(html).toContain('guide ~1');
  });
});
