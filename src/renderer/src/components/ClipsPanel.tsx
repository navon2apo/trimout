/**
 * ClipsPanel — Visual clips browser in the AI sidebar.
 * Shows every segment as a card with name, action badge, times, duration and controls.
 * Clicking a clip → seeks playhead to its start.
 */
import { memo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Seg {
  segId?: string | undefined;
  start: number;
  end?: number | undefined;
  name?: string | undefined;
  segColorIndex?: number | undefined;
  actionType?: string | undefined;
  playerName?: string | undefined;
  isFavorite?: boolean | undefined;
  isUncertain?: boolean | undefined;
}

interface Props {
  segments: Seg[];
  currentSegIndex: number;
  formatTimecode: (s: number) => string;
  onSegClick: (i: number) => void;
  onPlayClip?: (i: number) => void;
  onDeleteSegment: (i: number) => void;
  onToggleFavorite?: (i: number) => void;
  onUploadClip?: (i: number) => void;
}

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f43f5e', '#06b6d4', '#a3e635', '#fb923c',
];

function segColor(idx: number | undefined): string {
  return PALETTE[(idx ?? 0) % PALETTE.length] ?? '#38bdf8';
}

function fmtDuration(start: number, end: number | undefined): string {
  if (end == null) return '—';
  const s = end - start;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}m ${sec}s`;
}

// Secondary (negative) actions shown in a muted red tone
const SECONDARY_ACTION_LABELS = new Set([
  'Turnover', 'Poor pass', 'Late to ball', 'Defensive mistake',
  'Wrong position', 'Poor decision', 'Unnecessary foul', 'Not relevant',
]);

function actionBadgeStyle(actionType: string | undefined, isUncertain: boolean | undefined): React.CSSProperties {
  if (!actionType) return {};
  if (isUncertain) return { background: 'rgba(251,191,36,0.18)', color: 'rgba(253,224,71,0.9)', border: '1px solid rgba(251,191,36,0.3)' };
  if (SECONDARY_ACTION_LABELS.has(actionType)) return { background: 'rgba(248,113,113,0.15)', color: 'rgba(252,165,165,0.9)', border: '1px solid rgba(248,113,113,0.25)' };
  return { background: 'rgba(20,184,166,0.15)', color: 'rgba(94,234,212,0.95)', border: '1px solid rgba(20,184,166,0.3)' };
}

function ClipsPanel({ segments, currentSegIndex, formatTimecode, onSegClick, onPlayClip, onDeleteSegment, onToggleFavorite, onUploadClip }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentSegIndex]);

  if (segments.length === 0) {
    return (
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.55)', textAlign: 'center', padding: '14px 0', lineHeight: 1.5 }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>✂️</div>
          Press the button below<br />to mark an important moment
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '0 0 4px 0' }}>
      {/* Header — no duplicate add button; the main ✂️ on the video is the only way to add */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px 6px' }}>
        <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', flex: 1 }}>
          ✂️ {segments.length} clip{segments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Clip list */}
      <div ref={listRef} style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: '0 8px 8px' }}>
        <AnimatePresence initial={false}>
          {segments.map((seg, i) => {
            const isActive = i === currentSegIndex;
            const color = segColor(seg.segColorIndex);
            // Display name: use actionType if available, else fallback to seg.name or generic
            const displayName = seg.name || (seg.actionType ? `${seg.playerName ? `${seg.playerName} ` : ''}${seg.actionType} ${i + 1}` : `Clip ${i + 1}`);

            return (
              <motion.div
                key={seg.segId ?? `seg-${i}`}
                ref={isActive ? activeRef : undefined}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                onClick={() => onSegClick(i)}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'stretch',
                  gap: 0,
                  borderRadius: 10,
                  cursor: 'pointer',
                  background: isActive ? `${color}1a` : (hoveredIndex === i ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)'),
                  border: `1px solid ${isActive ? `${color}60` : (hoveredIndex === i ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)')}`,
                  boxShadow: isActive ? `0 0 12px ${color}25` : 'none',
                  transition: 'background 0.12s, border-color 0.12s, box-shadow 0.12s',
                  userSelect: 'none',
                  overflow: 'hidden',
                  direction: 'ltr',
                }}
              >
                {/* Color bar */}
                <div style={{
                  width: 4,
                  flexShrink: 0,
                  background: color,
                  boxShadow: isActive ? `0 0 8px ${color}90` : 'none',
                }}
                />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, padding: '9px 10px 9px 6px' }}>
                  {/* Top row: name + favorite */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                    <div style={{
                      fontSize: 12.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#f1f5f9' : 'rgba(203,213,225,0.9)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                      minWidth: 0,
                    }}
                    >
                      {displayName}
                    </div>
                    {/* Favorite star */}
                    {onToggleFavorite && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(i); }}
                        title={seg.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: 13,
                          lineHeight: 1,
                          flexShrink: 0,
                          color: seg.isFavorite ? '#fbbf24' : 'rgba(148,163,184,0.3)',
                          transition: 'color 0.12s',
                        }}
                      >★
                      </button>
                    )}
                  </div>

                  {/* Action badge + uncertain tag */}
                  {seg.actionType && (
                    <div style={{ marginBottom: 5, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        borderRadius: 6,
                        padding: '2px 7px',
                        ...actionBadgeStyle(seg.actionType, seg.isUncertain),
                      }}
                      >
                        {seg.actionType}
                      </span>
                      {seg.isUncertain && (
                        <span style={{ fontSize: 10, color: 'rgba(251,191,36,0.7)', alignSelf: 'center' }}>❓</span>
                      )}
                    </div>
                  )}

                  {/* Time row */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <span style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: isActive ? color : 'rgba(203,213,225,0.7)',
                      letterSpacing: '0.02em',
                    }}
                    >
                      {formatTimecode(seg.start)}
                    </span>
                    {seg.end != null && (
                      <>
                        <span style={{ fontSize: 10.5, color: 'rgba(100,116,139,0.5)' }}>→</span>
                        <span style={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: isActive ? color : 'rgba(203,213,225,0.7)',
                          letterSpacing: '0.02em',
                        }}
                        >
                          {formatTimecode(seg.end)}
                        </span>
                        <span style={{
                          fontSize: 10.5,
                          color: 'rgba(148,163,184,0.55)',
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: 4,
                          padding: '1px 5px',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                        >
                          {fmtDuration(seg.start, seg.end)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right-side actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, paddingLeft: 4 }}>
                  {/* ▶ play */}
                  <motion.button
                    type="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={(e) => { e.stopPropagation(); if (onPlayClip) onPlayClip(i); else onSegClick(i); }}
                    title="Play clip"
                    style={{
                      background: isActive ? `${color}30` : 'rgba(255,255,255,0.07)',
                      border: `1px solid ${isActive ? `${color}60` : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 6,
                      color: isActive ? color : 'rgba(203,213,225,0.6)',
                      fontSize: 10,
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      lineHeight: 1,
                      transition: 'background 0.12s, border-color 0.12s, color 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${color}45`; e.currentTarget.style.color = color; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isActive ? `${color}30` : 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = isActive ? color : 'rgba(203,213,225,0.6)'; }}
                  >▶
                  </motion.button>

                  {/* Cloud / delete — appear on hover */}
                  {hoveredIndex !== i && (
                    <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.22)', lineHeight: 1, userSelect: 'none', width: 18, textAlign: 'center' }}>
                      ☁
                    </div>
                  )}

                  {hoveredIndex === i && (
                    <>
                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.1 }}
                        onClick={(e) => { e.stopPropagation(); onUploadClip?.(i); }}
                        title={onUploadClip ? 'Upload to cloud' : 'Cloud upload coming soon'}
                        style={{
                          background: onUploadClip ? 'rgba(56,189,248,0.15)' : 'rgba(100,116,139,0.08)',
                          border: `1px solid ${onUploadClip ? 'rgba(56,189,248,0.35)' : 'rgba(100,116,139,0.18)'}`,
                          borderRadius: 5,
                          color: onUploadClip ? 'rgba(56,189,248,0.9)' : 'rgba(100,116,139,0.45)',
                          fontSize: 12,
                          width: 18,
                          height: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: onUploadClip ? 'pointer' : 'default',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >☁
                      </motion.button>

                      <motion.button
                        type="button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.1 }}
                        onClick={(e) => { e.stopPropagation(); onDeleteSegment(i); }}
                        title="Delete clip"
                        style={{
                          background: 'rgba(248,113,113,0.15)',
                          border: '1px solid rgba(248,113,113,0.3)',
                          borderRadius: 5,
                          color: 'rgba(248,113,113,0.85)',
                          fontSize: 11,
                          width: 18,
                          height: 18,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >✕
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default memo(ClipsPanel);
