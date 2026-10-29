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
  actionCounts?: Record<string, number> | undefined;
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

  let bg = hovered ? '#f1f5f9' : '#ffffff';
  let border = hovered ? '#94a3b8' : '#d0d5dd';
  let color = '#0f172a';

  if (action.id === 'goal') {
    bg = hovered ? '#dcfce7' : '#f0fdf4';
    border = hovered ? '#22c55e' : '#86efac';
    color = '#166534';
  } else if (action.isUncertain) {
    bg = hovered ? '#fef9c3' : '#fefce8';
    border = hovered ? '#eab308' : '#fde047';
    color = '#854d0e';
  } else if (action.isNegative) {
    bg = hovered ? '#fee2e2' : '#fef2f2';
    border = hovered ? '#f87171' : '#fecaca';
    color = '#991b1b';
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

function ScoutActionCard({ action, role, badge, collected, guideTarget, onClick }: {
  action: SoccerAction;
  role: ScoutRole;
  badge?: string | undefined;
  collected: number;
  guideTarget: number;
  onClick: () => void;
}) {
  const catalogAction = SCOUT_ACTION_BY_ID.get(action.id);
  const guidance = getScoutIqGuidance(role, action.id);
  return (
    <button type="button" className="scout-action-card" onClick={onClick}>
      <span className="scout-action-card-top">
        <strong style={{ color: catalogAction?.color }}>{action.label}</strong>
        {badge && <small>{badge}</small>}
      </span>
      <span>{catalogAction?.helper}</span>
      <span className="scout-action-card-progress"><b>{collected} collected</b><small>guide ~{guideTarget}</small></span>
      <em>{guidance.hint}</em>
    </button>
  );
}

function ActionPickerModal({ visible, playerName, clipDurationSec, scoutRole, scoutContext, actionCounts = {}, onConfirm, onCancel }: Props) {
  const [showSecondary, setShowSecondary] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const submitCustom = () => {
    const value = customLabel.trim();
    if (!value) return;
    onConfirm({ id: 'custom', label: value });
    setCustomLabel('');
  };
  const openingActions = scoutRole
    ? scoutRole.openingPriority
      .map((id) => PRIMARY_ACTIONS.find((action) => action.id === id))
      .filter((action): action is SoccerAction => action != null)
    : [];
  const consistencyActions = scoutRole
    ? scoutRole.recommendedActions
      .filter((id) => !scoutRole.openingPriority.includes(id))
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
            background: 'rgba(15,23,42,0.45)',
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
              background: '#ffffff',
              border: '1px solid #e4e7ec',
              borderRadius: 16,
              boxShadow: '0 24px 64px rgba(15,23,42,0.22)',
              direction: 'ltr',
              overflowY: 'auto',
            }}
          >
            {/* Header strip */}
            <div style={{
              padding: '18px 20px 14px',
              borderBottom: '1px solid #e4e7ec',
            }}
            >
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#0f172a',
                marginBottom: 3,
                letterSpacing: '-0.01em',
              }}
              >
                What happened here?
              </div>
              {meta && (
                <div style={{ fontSize: 11.5, color: '#64748b', letterSpacing: '0.02em' }}>
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
                  <div className="scout-picker-section-title">
                    <strong>Opening ideas</strong>
                    <span>Strong options for the first ~30 seconds. Pick any that fit.</span>
                  </div>
                  <div className="scout-action-card-grid">
                    {openingActions.map((action) => (
                      <ScoutActionCard
                        key={action.id}
                        action={action}
                        role={scoutRole}
                        badge={scoutContext.missingActionTypes.includes(action.id) ? 'SUGGESTED NEXT' : 'OPENING IDEA'}
                        collected={actionCounts[action.id] ?? 0}
                        guideTarget={1}
                        onClick={() => onConfirm(action)}
                      />
                    ))}
                  </div>
                  {consistencyActions.length > 0 && (
                    <>
                      <div className="scout-picker-section-title consistency">
                        <strong>Consistency & Soccer IQ ideas</strong>
                        <span>Use any that add variety or repeated evidence across games.</span>
                      </div>
                      <div className="scout-action-card-grid">
                        {consistencyActions.map((action) => (
                          <ScoutActionCard
                            key={action.id}
                            action={action}
                            role={scoutRole}
                            badge={scoutContext.phase === 'consistency' && scoutContext.missingActionTypes.includes(action.id) ? 'SUGGESTED NEXT' : undefined}
                            collected={actionCounts[action.id] ?? 0}
                            guideTarget={scoutRole.consistencyTargets[action.id] ?? 1}
                            onClick={() => onConfirm(action)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PRIMARY_ACTIONS.map((action) => <ActionBtn key={action.id} action={action} onClick={() => onConfirm(action)} />)}
                </div>
              )}
            </div>

            {/* Secondary toggle + actions */}
            <div style={{
              borderTop: '1px solid #e4e7ec',
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
                  color: '#64748b',
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
                {showSecondary ? 'Hide other actions' : 'All other actions'}
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
                      {[...otherActions, ...SECONDARY_ACTIONS].map((action) => (
                        <ActionBtn key={action.label} action={action} onClick={() => onConfirm(action)} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Custom label — write your own move, in any language */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e4e7ec' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 7, letterSpacing: '0.02em' }}>Or write your own move</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  dir="auto"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitCustom(); }}
                  placeholder="Type a move name — any language"
                  style={{ flex: 1, minHeight: 38, boxSizing: 'border-box', background: '#ffffff', border: '1px solid #d0d5dd', borderRadius: 8, color: '#0f172a', padding: '0 12px', fontSize: 13, outline: 'none' }}
                />
                <button
                  type="button"
                  disabled={!customLabel.trim()}
                  onClick={submitCustom}
                  style={{ background: customLabel.trim() ? '#d2ff00' : '#f1f5f9', color: customLabel.trim() ? '#071018' : '#94a3b8', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 700, fontSize: 13, cursor: customLabel.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                >
                  Add move
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 16px 14px',
              borderTop: '1px solid #e4e7ec',
              display: 'flex',
              justifyContent: 'flex-start',
            }}
            >
              <button
                type="button"
                onClick={onCancel}
                style={{
                  background: 'none',
                  border: '1px solid #e4e7ec',
                  borderRadius: 7,
                  color: '#64748b',
                  fontSize: 12,
                  padding: '5px 16px',
                  cursor: 'pointer',
                  transition: 'border-color 0.1s, color 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d0d5dd'; e.currentTarget.style.color = '#64748b'; }}
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
