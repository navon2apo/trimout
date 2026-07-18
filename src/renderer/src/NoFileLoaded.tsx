import { memo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FiLink, FiPlus } from 'react-icons/fi';
import type { StateSegment } from './types';
import type { KeyBinding } from '../../common/types';
import trimOutLogoUrl from './trimout-logo.png';

const container: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  overflow: 'hidden',
  userSelect: 'none',
};

function NoFileLoaded({ onClick, onUrlDownload }: {
  currentCutSeg: StateSegment | undefined,
  onClick: () => void,
  darkMode?: boolean,
  keyBindingByAction: Record<string, KeyBinding>,
  onUrlDownload?: (url: string) => void,
}) {
  const [dragging, setDragging] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlFocused, setUrlFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidUrl = useCallback((s: string) => {
    try { const u = new URL(s.trim()); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
  }, []);

  const handleUrlSubmit = useCallback(() => {
    if (isValidUrl(urlValue) && onUrlDownload) onUrlDownload(urlValue.trim());
  }, [urlValue, isValidUrl, onUrlDownload]);

  const handleUrlPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (isValidUrl(text)) {
      setTimeout(() => {
        setUrlValue(text.trim());
      }, 10);
    }
  }, [isValidUrl]);

  return (
    <div
      style={container}
      role="button"
      onClick={onClick}
      onDragOver={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
    >
      {/* Dashed border */}
      <motion.div
        animate={{ borderColor: dragging ? 'rgba(210,255,0,0.55)' : 'rgba(255,255,255,0.08)' }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute', inset: 16, borderRadius: 14,
          border: '1.5px dashed rgba(255,255,255,0.07)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}
      >
        {/* Brand */}
        <motion.div
          animate={{
            borderColor: dragging ? 'rgba(210,255,0,0.65)' : 'rgba(255,255,255,0.14)',
            boxShadow: dragging ? '0 0 28px rgba(210,255,0,0.18)' : '0 8px 28px rgba(0,0,0,0.28)',
          }}
          transition={{ duration: 0.3 }}
          style={{
            marginBottom: 24,
            padding: '12px 18px',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 8,
            background: '#f4f8f7',
          }}
        >
          <img
            src={trimOutLogoUrl}
            alt="TrimOut by KICKO"
            style={{
              display: 'block', width: 340, maxWidth: '42vw', height: 'auto',
            }}
          />
        </motion.div>

        {/* Tagline */}
        <div style={{
          fontSize: 13.5, color: 'rgba(148,163,184,0.85)', marginBottom: 6,
          letterSpacing: '0.01em', textAlign: 'center',
        }}>
          Find the moments that matter.
        </div>

        {/* Sub tagline */}
        <div style={{
          fontSize: 11.5, color: 'rgba(100,116,139,0.8)', marginBottom: 36,
          textAlign: 'center', lineHeight: 1.7,
        }}>
          Cut and organize plays locally. Continue in KICKO when you are ready.
        </div>

        {/* CTA button */}
        <motion.div
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: 68, height: 68, borderRadius: '50%', marginBottom: 18,
            background: 'rgba(210,255,0,0.12)',
            border: '1.5px solid rgba(210,255,0,0.38)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, color: '#d2ff00',
            boxShadow: '0 0 24px rgba(210,255,0,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
            cursor: 'pointer',
          }}
        >
          <FiPlus />
        </motion.div>

        {/* Action label */}
        <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)', marginBottom: 16 }}>
          Click or drag a video file to get started
        </div>

        {/* URL input */}
        <div style={{ width: '100%', maxWidth: 340, marginBottom: 20 }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${urlFocused ? 'rgba(210,255,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10, padding: '6px 8px',
            transition: 'border-color 0.2s',
          }}>
            <FiLink style={{ color: 'rgba(210,255,0,0.72)' }} />
            <input
              ref={inputRef}
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              onPaste={handleUrlPaste}
              onFocus={() => setUrlFocused(true)}
              onBlur={() => setUrlFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUrlSubmit(); }}
              placeholder="Paste a YouTube / video URL…"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: '#e2e8f0', fontSize: 12.5, caretColor: '#d2ff00',
              }}
            />
            <AnimatePresence>
              {isValidUrl(urlValue) && (
                <motion.button
                  key="go"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={handleUrlSubmit}
                  style={{
                    padding: '3px 12px', borderRadius: 7,
                    background: '#d2ff00',
                    border: '1px solid #d2ff00', color: '#071018',
                    fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Download ↓
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

export default memo(NoFileLoaded);
