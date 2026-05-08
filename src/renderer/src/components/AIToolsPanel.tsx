import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Segment { start: number; end: number }

interface Props {
  filePath: string | undefined;
  fileDuration: number;
  onApplySegments: (segs: Segment[], label: string) => void;
}

type ToolId = 'silence' | 'highlights' | 'scenes';
type Status = 'idle' | 'running' | 'done' | 'error';

interface ToolState {
  status: Status;
  result?: Segment[];
  count?: number;
  error?: string;
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14,
  padding: '18px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  cursor: 'pointer',
  transition: 'border-color 0.2s',
};

const tools: { id: ToolId; emoji: string; title: string; desc: string; applyLabel: string }[] = [
  {
    id: 'silence',
    emoji: '🔇',
    title: 'Remove Silence',
    desc: 'Cuts out all the quiet parts automatically',
    applyLabel: 'speech segments',
  },
  {
    id: 'highlights',
    emoji: '⚡',
    title: 'Find Highlights',
    desc: 'Marks the loudest, most exciting moments',
    applyLabel: 'highlight moments',
  },
  {
    id: 'scenes',
    emoji: '🎬',
    title: 'Scene Split',
    desc: 'Splits video every time the scene changes',
    applyLabel: 'scenes',
  },
];

export default function AIToolsPanel({ filePath, onApplySegments }: Props) {
  const [states, setStates] = useState<Partial<Record<ToolId, ToolState>>>({});

  const setTool = useCallback((id: ToolId, s: Partial<ToolState>) => {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], status: 'idle', ...s } }));
  }, []);

  const runTool = useCallback(async (id: ToolId) => {
    if (!filePath) return;
    setTool(id, { status: 'running', result: undefined, error: undefined });

    try {
      let segs: Segment[] = [];

      if (id === 'silence') {
        segs = await window.electron.detectSpeechSegments(filePath, -30, 0.5);
      } else if (id === 'highlights') {
        segs = await window.electron.detectEnergyPeaks(filePath, -18, 0.3);
      } else if (id === 'scenes') {
        const times = await window.electron.detectSceneChanges(filePath, 0.3);
        // Convert scene-change timestamps into segments
        const allTimes = [0, ...times];
        segs = allTimes.map((t, i) => ({ start: t, end: allTimes[i + 1] ?? 999999 }));
      }

      setTool(id, { status: 'done', result: segs, count: segs.length });
    } catch (err) {
      setTool(id, { status: 'error', error: String(err) });
    }
  }, [filePath, setTool]);

  const applyTool = useCallback((id: ToolId) => {
    const s = states[id];
    if (!s?.result?.length) return;
    const tool = tools.find((t) => t.id === id)!;
    onApplySegments(s.result, tool.applyLabel);
    setTool(id, { status: 'idle', result: undefined });
  }, [states, onApplySegments, setTool]);

  if (!filePath) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}
    >
      <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
        🤖 AI Tools
      </div>

      {tools.map(({ id, emoji, title, desc, applyLabel }) => {
        const s = states[id] ?? { status: 'idle' as const };
        const isRunning = s.status === 'running';
        const isDone = s.status === 'done';
        const isError = s.status === 'error';

        return (
          <div key={id} style={{ ...cardStyle, borderColor: isDone ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>{emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{title}</div>
                <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.7)', marginTop: 2 }}>{desc}</div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isRunning && (
                <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(56,189,248,0.8)' }}>
                  <SpinnerIcon /> Analyzing…
                </motion.div>
              )}

              {isDone && (
                <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'rgba(56,189,248,0.9)' }}>
                    ✓ Found {s.count} {applyLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => applyTool(id)}
                    style={{
                      marginLeft: 'auto', padding: '4px 14px', borderRadius: 20,
                      background: 'linear-gradient(135deg,rgba(56,189,248,0.2),rgba(129,140,248,0.2))',
                      border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setTool(id, { status: 'idle' })}
                    style={{ padding: '4px 8px', borderRadius: 20, background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(148,163,184,0.6)', fontSize: 11, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </motion.div>
              )}

              {isError && (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ fontSize: 11, color: 'rgba(248,113,113,0.9)' }}>
                  ⚠ {s.error}
                </motion.div>
              )}
            </AnimatePresence>

            {!isRunning && !isDone && (
              <button
                type="button"
                onClick={() => runTool(id)}
                style={{
                  padding: '7px 0', borderRadius: 8, width: '100%',
                  background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
                  color: 'rgba(56,189,248,0.85)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.15)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.08)'; }}
              >
                Run
              </button>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="rgba(56,189,248,0.3)" strokeWidth="2" />
      <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
