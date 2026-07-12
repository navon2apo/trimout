/**
 * FormatPickerDialog — shown after the user pastes a URL and we've fetched
 * the available quality options from yt-dlp (without downloading).
 *
 * User picks a resolution → we kick off the actual download with that format ID.
 */
import { memo, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface VideoFormatOption {
  formatSelector: string;
  height: number | null;
  label: string;
  filesize: number | null;
  codec: string;
  container: string;
  fps: number | null;
  recommended?: boolean;
}

export interface VideoInfo {
  title: string;
  durationSec: number | null;
  thumbnail: string | null;
  formats: VideoFormatOption[];
}

interface Props {
  visible: boolean;
  info: VideoInfo | null;
  onConfirm: (formatSelector: string) => void;
  onCancel: () => void;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null || bytes === 0) return '— MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatDuration(s: number | null): string {
  if (s == null || s === 0) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  if (m < 60) return `${m}:${String(sec).padStart(2, '0')}`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}:${String(remM).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function FormatPickerDialog({ visible, info, onConfirm, onCancel }: Props) {
  // Default-select the recommended option (or first) when info changes
  const defaultIdx = useMemo(() => {
    if (!info?.formats?.length) return 0;
    const recIdx = info.formats.findIndex((f) => f.recommended);
    return Math.max(recIdx, 0);
  }, [info]);
  const [selectedIdx, setSelectedIdx] = useState<number>(defaultIdx);
  useEffect(() => { setSelectedIdx(defaultIdx); }, [defaultIdx]);

  return (
    <AnimatePresence>
      {visible && info && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
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
              width: 460,
              maxWidth: '94vw',
              maxHeight: '88vh',
              background: 'rgba(13,17,27,0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              direction: 'ltr',
            }}
          >
            {/* Header */}
            <div style={{ padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {info.thumbnail && (
                <img
                  src={info.thumbnail}
                  alt=""
                  style={{
                    width: 80,
                    height: 45,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.08)',
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#e2e8f0',
                  marginBottom: 3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.3,
                }}
                >
                  {info.title}
                </div>
                {info.durationSec != null && (
                  <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)' }}>
                    {formatDuration(info.durationSec)}
                  </div>
                )}
              </div>
            </div>

            {/* Format list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
              {info.formats.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'rgba(148,163,184,0.6)' }}>
                  No available formats were found for this file.
                </div>
              )}
              {info.formats.map((f, i) => {
                const isSel = i === selectedIdx;
                return (
                  <button
                    key={f.formatSelector}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    onDoubleClick={() => onConfirm(f.formatSelector)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      marginBottom: 4,
                      background: isSel ? 'rgba(20,184,166,0.15)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isSel ? 'rgba(20,184,166,0.55)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: 8,
                      color: isSel ? '#e2e8f0' : 'rgba(203,213,225,0.85)',
                      cursor: 'pointer',
                      transition: 'background 0.1s, border-color 0.1s',
                      textAlign: 'left',
                      direction: 'ltr',
                    }}
                  >
                    {/* Radio indicator */}
                    <div style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: `2px solid ${isSel ? '#14b8a6' : 'rgba(255,255,255,0.2)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    >
                      {isSel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#14b8a6' }} />}
                    </div>

                    {/* Resolution */}
                    <div style={{ fontSize: 13.5, fontWeight: 700, minWidth: 50 }}>
                      {f.label}
                      {f.fps && f.fps >= 50 && <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(148,163,184,0.6)', marginRight: 4 }}>{f.fps}fps</span>}
                    </div>

                    {/* Filesize */}
                    <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.85)', minWidth: 70, fontVariantNumeric: 'tabular-nums' }}>
                      {formatBytes(f.filesize)}
                    </div>

                    {/* Codec */}
                    <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.55)', flex: 1 }}>
                      {f.codec} · {f.container.toUpperCase()}
                    </div>

                    {/* Recommended badge */}
                    {f.recommended && (
                      <div style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: 'rgba(20,184,166,0.2)',
                        color: 'rgba(94,234,212,0.95)',
                        padding: '2px 7px',
                        borderRadius: 4,
                        border: '1px solid rgba(20,184,166,0.3)',
                      }}
                      >
                        Recommended
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 8,
            }}
            >
              <button
                type="button"
                onClick={onCancel}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 7,
                  color: 'rgba(148,163,184,0.85)',
                  fontSize: 12.5,
                  padding: '7px 18px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const f = info.formats[selectedIdx];
                  if (f) onConfirm(f.formatSelector);
                }}
                disabled={info.formats.length === 0}
                style={{
                  background: info.formats.length === 0
                    ? 'rgba(255,255,255,0.05)'
                    : 'linear-gradient(135deg,#10b981,#14b8a6)',
                  border: 'none',
                  borderRadius: 7,
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  padding: '7px 22px',
                  cursor: info.formats.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: info.formats.length === 0 ? 'none' : '0 2px 8px rgba(20,184,166,0.3)',
                  opacity: info.formats.length === 0 ? 0.5 : 1,
                }}
              >
                Download now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(FormatPickerDialog);
