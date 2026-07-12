/**
 * ActionPickerModal — appears after the ✂️ button is pressed.
 * Clean, professional design. No emoji overload.
 */
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FiChevronDown } from 'react-icons/fi';
import type { ScoutPhaseContext, ScoutRole } from '../scoutCatalog';
import { SCOUT_ACTIONS, SCOUT_ACTION_BY_ID, getScoutIqGuidance } from '../scoutCatalog';

export interface SoccerAction {
  id: string;
  label: string;
  isUncertain?: true;
  isNegative?: true;
}

export const PRIMARY_ACTIONS: SoccerAction[] = SCOUT_ACTIONS.map(({ id, label }) => ({ id, label }));

export const SECONDARY_ACTIONS: SoccerAction[] = [
  { id: 'turnover', label: 'Turnover', isNegative: true },
  { id: 'poor_pass', label: 'Poor pass', isNegative: true },
  { id: 'late_to_ball', label: 'Late to ball', isNegative: true },
  { id: 'defensive_mistake', label: 'Defensive mistake', isNegative: true },
  { id: 'wrong_position', label: 'Wrong position', isNegative: true },
  { id: 'poor_decision', label: 'Poor decision', isNegative: true },
  { id: 'unnecessary_foul', label: 'Unnecessary foul', isNegative: true },
  { id: 'not_relevant', label: 'Not relevant', isNegative: true },
];

interface Props {
  visible: boolean;
  playerName: string;
  clipDurationSec: number;
  scoutRole?: ScoutRole | null | undefined;
  scoutContext?: ScoutPhaseContext | null | undefined;
  onConfirm: (action: SoccerAction) => void;
  onCancel: () => void;
}

function ActionBtn({
  action,
  onClick,
}: {
  action: SoccerAction;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  let bg = hovered ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)';
  let border = hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
  let color = hovered ? '#f1f5f9' : 'rgba(203,213,225,0.85)';

  if (action.id === 'goal') {
    bg = hovered ? 'rgba(34,197,94,0.22)' : 'rgba(34,197,94,0.1)';
    border = hovered ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.25)';
    color = hovered ? '#86efac' : 'rgba(134,239,172,0.85)';
  } else if (action.isUncertain) {
    bg = hovered ? 'rgba(234,179,8,0.18)' : 'rgba(234,179,8,0.08)';
    border = hovered ? 'rgba(234,179,8,0.45)' : 'rgba(234,179,8,0.2)';
    color = hovered ? '#fde047' : 'rgba(253,224,71,0.8)';
  } else if (action.isNegative) {
    bg = hovered ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)';
    border = hovered ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.15)';
    color = hovered ? '#fca5a5' : 'rgba(252,165,165,0.75)';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 8,
        color,
        fontSize: 12.5,
        fontWeight: 500,
        padding: '8px 14px',
        cursor: 'pointer',
        transition: 'background 0.1s, border-color 0.1s, color 0.1s, transform 0.08s',
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        direction: 'ltr',
      }}
    >
      {action.label}
    </button>
  );
}

function ScoutActionCard({ action, role, missing, onClick }: {
  action: SoccerAction;
  role: ScoutRole;
  missing: boolean;
  onClick: () => void;
}) {
  const catalogAction = SCOUT_ACTION_BY_ID.get(action.id);
  const guidance = getScoutIqGuidance(role, action.id);
  return (
    <button type="button" className="scout-action-card" onClick={onClick}>
      <span className="scout-action-card-top">
        <strong style={{ color: catalogAction?.color }}>{action.label}</strong>
        {missing && <small>COLLECT NEXT</small>}
      </span>
      <span>{catalogAction?.helper}</span>
      <em>{guidance.hint}</em>
    </button>
  );
}

function ActionPickerModal({ visible, playerName, clipDurationSec, scoutRole, scoutContext, onConfirm, onCancel }: Props) {
  const [showSecondary, setShowSecondary] = useState(false);
  const spotlightIds = scoutRole && scoutContext
    ? (scoutContext.phase === 'opening' ? scoutRole.openingPriority : scoutContext.recommendedActionTypes.slice(0, 6))
    : [];
  const spotlightActions = spotlightIds.map((id) => PRIMARY_ACTIONS.find((action) => action.id === id)).filter((action): action is SoccerAction => action != null);
  const additionalRoleActions = scoutRole
    ? scoutRole.recommendedActions
      .filter((id) => !spotlightIds.includes(id))
      .map((id) => PRIMARY_ACTIONS.find((action) => action.id === id))
      .filter((action): action is SoccerAction => action != null)
    : [];
  const otherActions = scoutRole ? PRIMARY_ACTIONS.filter((action) => !scoutRole.recommendedActions.includes(action.id)) : [];

  const meta = [
    playerName.trim(),
    `${clipDurationSec}s`,
  ].filter(Boolean).join(' · ');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 560,
              maxWidth: '92vw',
              maxHeight: '88vh',
              background: 'rgba(13,17,27,0.96)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              direction: 'ltr',
              overflowY: 'auto',
            }}
          >
            {/* Header strip */}
            <div style={{
              padding: '18px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
            >
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#e2e8f0',
                marginBottom: 3,
                letterSpacing: '-0.01em',
              }}
              >
                What happened here?
              </div>
              {meta && (
                <div style={{ fontSize: 11.5, color: 'rgba(148,163,184,0.55)', letterSpacing: '0.02em' }}>
                  {meta}
                </div>
              )}
            </div>

            {/* Primary actions */}
            <div style={{ padding: '14px 16px 12px' }}>
              {scoutRole && scoutContext ? (
                <>
                  <div className="scout-picker-phase">
                    <strong>{scoutContext.title}</strong>
                    <span>{scoutContext.description}</span>
                  </div>
                  <div className="scout-action-card-grid">
                    {spotlightActions.map((action) => (
                      <ScoutActionCard
                        key={action.id}
                        action={action}
                        role={scoutRole}
                        missing={scoutContext.missingActionTypes.includes(action.id)}
                        onClick={() => onConfirm(action)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRIMARY_ACTIONS.map((action) => <ActionBtn key={action.id} action={action} onClick={() => onConfirm(action)} />)}
                </div>
              )}
            </div>

            {/* Secondary toggle + actions */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              padding: '10px 16px',
            }}
            >
              <button
                type="button"
                onClick={() => setShowSecondary((v) => !v)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(100,116,139,0.7)',
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '2px 0',
                  letterSpacing: '0.02em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <FiChevronDown style={{
                  transition: 'transform 0.15s',
                  transform: showSecondary ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
                />
                {showSecondary ? 'Hide extra actions' : (scoutRole ? `More actions for ${scoutRole.label}` : 'Show extra actions')}
              </button>

              <AnimatePresence>
                {showSecondary && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      paddingTop: 10,
                    }}
                    >
                      {[...additionalRoleActions, ...otherActions, ...SECONDARY_ACTIONS].map((action) => (
                        <ActionBtn key={action.label} action={action} onClick={() => onConfirm(action)} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 16px 14px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'flex-start',
            }}
            >
              <button
                type="button"
                onClick={onCancel}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 7,
                  color: 'rgba(100,116,139,0.7)',
                  fontSize: 12,
                  padding: '5px 16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.1s, color 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(148,163,184,0.9)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(100,116,139,0.7)'; }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(ActionPickerModal);
