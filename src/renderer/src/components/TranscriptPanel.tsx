/**
 * TranscriptPanel — Phase 3 + 3b
 * Local Whisper transcription with:
 *   - Model selector (tiny / base / small)
 *   - Progress feedback
 *   - Scrollable timed transcript (click → jump to time)
 *   - Keyword search → highlight matching segments
 *   - "Make clips from keyword" — extracts matching segments as timeline clips
 *   - "Export SRT" — saves transcript as .srt subtitle file
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface Props {
  filePath: string | undefined;
  onSeek: (time: number) => void;
  onApplySegments: (segs: { start: number; end: number; name: string }[]) => void;
}

type ModelId = 'tiny.en' | 'tiny' | 'base.en' | 'base' | 'small.en' | 'small';
type Status = 'idle' | 'running' | 'done' | 'error';

interface ProgressState {
  stage: string;
  percent: number;
  message?: string;
}

const MODELS: { id: ModelId; label: string; note: string }[] = [
  { id: 'tiny.en',  label: 'Tiny (English)',  note: '~150 MB · fastest' },
  { id: 'tiny',     label: 'Tiny (multilingual)', note: '~150 MB · fastest' },
  { id: 'base.en',  label: 'Base (English)',  note: '~290 MB · balanced' },
  { id: 'base',     label: 'Base (multilingual)',  note: '~290 MB · balanced' },
  { id: 'small.en', label: 'Small (English)', note: '~970 MB · accurate' },
  { id: 'small',    label: 'Small (multilingual)', note: '~970 MB · accurate' },
];

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Build an SRT file from segments */
function buildSrt(segs: TranscriptSegment[]): string {
  function toSrtTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.round((s % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }
  return segs.map((seg, i) => `${i + 1}\n${toSrtTime(seg.start)} --> ${toSrtTime(seg.end)}\n${seg.text}`).join('\n\n');
}

export default function TranscriptPanel({ filePath, onSeek, onApplySegments }: Props) {
  const [model, setModel] = useState<ModelId>('tiny.en');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<ProgressState>({ stage: '', percent: 0 });
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const progressCleanupRef = useRef<(() => void) | null>(null);

  const filteredSegments = useMemo(() => {
    if (!keyword.trim()) return segments;
    const kw = keyword.toLowerCase();
    return segments.filter((s) => s.text.toLowerCase().includes(kw));
  }, [segments, keyword]);

  const handleTranscribe = useCallback(async () => {
    if (!filePath) return;
    setStatus('running');
    setError('');
    setSegments([]);
    setProgress({ stage: 'starting', percent: 0 });

    const { ipcRenderer } = window.require('electron');

    // Listen for progress events
    const onProgress = (_: unknown, p: ProgressState) => {
      setProgress(p);
      if (p.stage === 'error') {
        setStatus('error');
        setError(p.message ?? 'Unknown error');
      }
    };
    ipcRenderer.on('whisperProgress', onProgress);
    progressCleanupRef.current = () => ipcRenderer.removeListener('whisperProgress', onProgress);

    try {
      const result: TranscriptSegment[] = await ipcRenderer.invoke('whisperTranscribe', filePath, model);
      setSegments(result);
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(String(err));
    } finally {
      progressCleanupRef.current?.();
      progressCleanupRef.current = null;
    }
  }, [filePath, model]);

  const handleMakeClips = useCallback(() => {
    if (!filteredSegments.length) return;
    const kw = keyword.trim() || 'transcript';
    onApplySegments(filteredSegments.map((s) => ({ start: s.start, end: s.end, name: s.text.slice(0, 40) })));
  }, [filteredSegments, keyword, onApplySegments]);

  const handleExportSrt = useCallback(async () => {
    if (!segments.length || !filePath) return;
    const srtContent = buildSrt(segments);
    const { dialog } = window.require('@electron/remote');
    const { filePath: outPath } = await dialog.showSaveDialog({
      defaultPath: filePath.replace(/\.[^.]+$/, '.srt'),
      filters: [{ name: 'Subtitle', extensions: ['srt'] }],
    });
    if (!outPath) return;
    const fs = window.require('fs');
    fs.writeFileSync(outPath, srtContent, 'utf8');
  }, [segments, filePath]);

  const handleSegmentClick = useCallback((seg: TranscriptSegment, idx: number) => {
    setActiveIdx(idx);
    onSeek(seg.start);
  }, [onSeek]);

  if (!filePath) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px' }}
    >
      {/* Header */}
      <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
        🎙️ Transcript
      </div>

      <AnimatePresence mode="wait">
        {/* IDLE / SETUP */}
        {status === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Model picker */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ModelId)}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '6px 10px', color: '#e2e8f0', fontSize: 12,
                width: '100%', cursor: 'pointer', outline: 'none',
              }}
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id} style={{ background: '#1e293b' }}>
                  {m.label} — {m.note}
                </option>
              ))}
            </select>

            <div style={{ fontSize: 10.5, color: 'rgba(100,116,139,0.8)', lineHeight: 1.5 }}>
              Model downloads once and is cached. First run may take a minute.
            </div>

            <button
              type="button"
              onClick={handleTranscribe}
              style={{
                padding: '9px 0', borderRadius: 8, width: '100%',
                background: 'linear-gradient(135deg,rgba(56,189,248,0.15),rgba(129,140,248,0.15))',
                border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🎙️ Transcribe
            </button>
          </motion.div>
        )}

        {/* RUNNING */}
        {status === 'running' && (
          <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'rgba(56,189,248,0.9)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <SpinnerIcon />
              {progress.message ?? 'Working…'}
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <motion.div
                animate={{ width: `${progress.percent}%` }}
                transition={{ duration: 0.4 }}
                style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#38bdf8,#818cf8)' }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.8)', textAlign: 'right' }}>{progress.percent}%</div>
          </motion.div>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: 'rgba(248,113,113,0.9)', lineHeight: 1.5 }}>⚠ {error}</div>
            <button
              type="button"
              onClick={() => { setStatus('idle'); setError(''); }}
              style={{ padding: '5px 0', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(148,163,184,0.8)', fontSize: 12, cursor: 'pointer' }}
            >
              Try again
            </button>
          </motion.div>
        )}

        {/* DONE */}
        {status === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Action bar */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => { setStatus('idle'); setSegments([]); setKeyword(''); }}
                style={smallBtn}
              >
                ↩ Retranscribe
              </button>
              <button type="button" onClick={handleExportSrt} style={smallBtn}>
                📄 Export SRT
              </button>
            </div>

            {/* Keyword filter */}
            <div style={{
              display: 'flex', gap: 6, alignItems: 'center',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '5px 8px',
            }}>
              <span style={{ fontSize: 12 }}>🔍</span>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search transcript…"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 12, caretColor: '#38bdf8' }}
              />
              {keyword && (
                <button type="button" onClick={() => setKeyword('')}
                  style={{ background: 'none', border: 'none', color: 'rgba(148,163,184,0.5)', fontSize: 12, cursor: 'pointer', padding: 0 }}
                >✕</button>
              )}
            </div>

            {/* Make clips from keyword button */}
            {keyword.trim() && filteredSegments.length > 0 && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleMakeClips}
                style={{
                  padding: '7px 0', borderRadius: 8, width: '100%',
                  background: 'linear-gradient(135deg,rgba(56,189,248,0.18),rgba(129,140,248,0.18))',
                  border: '1px solid rgba(56,189,248,0.35)', color: '#38bdf8',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                ✂️ Make {filteredSegments.length} clips from "{keyword}"
              </motion.button>
            )}

            {!keyword.trim() && segments.length > 0 && (
              <button type="button" onClick={handleMakeClips}
                style={{
                  padding: '7px 0', borderRadius: 8, width: '100%',
                  background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
                  color: 'rgba(56,189,248,0.8)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                ✂️ All {segments.length} segments → clips
              </button>
            )}

            {/* Transcript list */}
            <div
              ref={listRef}
              style={{
                maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2,
                paddingRight: 2,
              }}
            >
              {(filteredSegments.length ? filteredSegments : segments).map((seg, idx) => {
                const isActive = idx === activeIdx;
                const kw = keyword.toLowerCase();
                const highlighted = kw
                  ? seg.text.replace(new RegExp(`(${escapeRegExp(kw)})`, 'gi'), '%%$1%%')
                  : seg.text;
                const parts = highlighted.split('%%');

                return (
                  <motion.div
                    key={`${seg.start}-${idx}`}
                    whileHover={{ background: 'rgba(56,189,248,0.08)' }}
                    onClick={() => handleSegmentClick(seg, idx)}
                    style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start', padding: '5px 6px',
                      borderRadius: 6, cursor: 'pointer',
                      background: isActive ? 'rgba(56,189,248,0.12)' : 'transparent',
                      border: isActive ? '1px solid rgba(56,189,248,0.25)' : '1px solid transparent',
                    }}
                  >
                    <span style={{ fontSize: 10, color: 'rgba(56,189,248,0.7)', whiteSpace: 'nowrap', marginTop: 2, minWidth: 32 }}>
                      {formatTime(seg.start)}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'rgba(226,232,240,0.85)', lineHeight: 1.5 }}>
                      {parts.map((part, i) => {
                        const isMatch = kw && i % 2 === 1;
                        return isMatch
                          ? <mark key={i} style={{ background: 'rgba(56,189,248,0.3)', color: '#e2e8f0', borderRadius: 2, padding: '0 2px' }}>{part}</mark>
                          : part;
                      })}
                    </span>
                  </motion.div>
                );
              })}
              {filteredSegments.length === 0 && keyword && (
                <div style={{ fontSize: 11, color: 'rgba(100,116,139,0.7)', textAlign: 'center', padding: '12px 0' }}>
                  No results for "{keyword}"
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ fontSize: 10.5, color: 'rgba(100,116,139,0.6)', textAlign: 'right' }}>
              {segments.length} segments · click to jump
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

const smallBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 20,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'rgba(148,163,184,0.8)', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap',
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="rgba(56,189,248,0.3)" strokeWidth="2" />
      <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
