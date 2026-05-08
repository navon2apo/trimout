/**
 * ClipsPanel — Visual clips browser in the AI sidebar.
 * Shows every segment as a card (name, start→end, duration, color bar).
 * Clicking a clip → seeks playhead to its start.
 * Active clip is highlighted.
 * Works alongside (not replacing) the full SegmentList.
 */
import { memo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Seg {
  start: number;
  end: number | undefined;
  name?: string;
  segColorIndex?: number;
}

interface Props {
  segments: Seg[];
  currentSegIndex: number;
  formatTimecode: (s: number) => string;
  onSegClick: (i: number) => void;      // select + seek
  onAddSegment: () => void;
  onDeleteSegment: (i: number) => void; // remove a clip
}

// Palette matching LosslessCut's segment colors (12 steps)
const PALETTE = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#14b8a6','#3b82f6','#8b5cf6','#ec4899',
  '#f43f5e','#06b6d4','#a3e635','#fb923c',
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

function ClipsPanel({ segments, currentSegIndex, formatTimecode, onSegClick, onAddSegment, onDeleteSegment }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Auto-scroll to active clip
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentSegIndex]);

  if (segments.length === 0) {
    return (
      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 10.5, color: 'rgba(100,116,139,0.7)', textAlign: 'center', padding: '12px 0' }}>
          No clips yet — use the AI tools above or press&nbsp;
          <button
            type="button"
            onClick={onAddSegment}
            style={{ background: 'none', border: 'none', color: 'rgba(56,189,248,0.8)', fontSize: 10.5, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            + Add clip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '0 0 4px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px 6px' }}>
        <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', flex: 1 }}>
          ✂️ {segments.length} Clip{segments.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={onAddSegment}
          title="Add clip"
          style={{
            background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)',
            borderRadius: 20, color: '#38bdf8', fontSize: 14, width: 22, height: 22,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            lineHeight: 1, padding: 0,
          }}
        >+</button>
      </div>

      {/* Clip list */}
      <div ref={listRef} style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' }}>
        <AnimatePresence initial={false}>
          {segments.map((seg, i) => {
            const isActive = i === currentSegIndex;
            const color = segColor(seg.segColorIndex);
            const name = seg.name || `Clip ${i + 1}`;

            return (
              <motion.div
                key={i}
                ref={isActive ? activeRef : undefined}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.15 }}
                onClick={() => onSegClick(i)}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
                  background: isActive ? `${color}18` : hoveredIndex === i ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? `${color}55` : hoveredIndex === i ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'background 0.12s, border-color 0.12s',
                  userSelect: 'none',
                  position: 'relative',
                }}
              >
                {/* Color bar */}
                <div style={{
                  width: 3, borderRadius: 99, alignSelf: 'stretch', flexShrink: 0,
                  background: color,
                  boxShadow: isActive ? `0 0 6px ${color}80` : 'none',
                }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name */}
                  <div style={{
                    fontSize: 11.5, fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#f1f5f9' : 'rgba(203,213,225,0.85)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {name}
                  </div>
                  {/* Times */}
                  <div style={{ fontSize: 10, color: 'rgba(100,116,139,0.8)', marginTop: 1, display: 'flex', gap: 4 }}>
                    <span>{formatTimecode(seg.start)}</span>
                    {seg.end != null && (
                      <>
                        <span style={{ color: 'rgba(100,116,139,0.4)' }}>→</span>
                        <span>{formatTimecode(seg.end)}</span>
                        <span style={{ color: 'rgba(100,116,139,0.5)', marginLeft: 2 }}>· {fmtDuration(seg.start, seg.end)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Active playhead indicator — hidden when hovered (X takes its place) */}
                {isActive && hoveredIndex !== i && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ fontSize: 10, color, flexShrink: 0 }}
                  >
                    ▶
                  </motion.div>
                )}

                {/* Delete button — appears on hover */}
                {hoveredIndex === i && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.1 }}
                    onClick={(e) => { e.stopPropagation(); onDeleteSegment(i); }}
                    title="Remove clip"
                    style={{
                      flexShrink: 0,
                      background: 'rgba(248,113,113,0.15)',
                      border: '1px solid rgba(248,113,113,0.3)',
                      borderRadius: 5,
                      color: 'rgba(248,113,113,0.85)',
                      fontSize: 11,
                      width: 18, height: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default memo(ClipsPanel);
