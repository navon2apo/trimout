import { memo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FiLink, FiPlus } from 'react-icons/fi';
import type { StateSegment } from './types';
import type { KeyBinding } from '../../common/types';

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

// Inline SVG icon — clean trim / cut mark
function TrimIcon() {
  return (
    <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Gradient defs */}
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#d2ff00" />
          <stop offset="100%" stopColor="#82b300" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Film strip left */}
      <rect x="3" y="10" width="19" height="34" rx="3" stroke="url(#g1)" strokeWidth="2.2" fill="none" filter="url(#glow)" />
      <rect x="6" y="14" width="4" height="4" rx="1" fill="url(#g1)" opacity="0.7" />
      <rect x="6" y="22" width="4" height="4" rx="1" fill="url(#g1)" opacity="0.7" />
      <rect x="6" y="30" width="4" height="4" rx="1" fill="url(#g1)" opacity="0.7" />
      <rect x="6" y="38" width="4" height="4" rx="1" fill="url(#g1)" opacity="0.7" />
      {/* Film strip right */}
      <rect x="32" y="10" width="19" height="34" rx="3" stroke="url(#g1)" strokeWidth="2.2" fill="none" filter="url(#glow)" />
      <rect x="44" y="14" width="4" height="4" rx="1" fill="url(#g1)" opacity="0.7" />
      <rect x="44" y="22" width="4" height="4" rx="1" fill="url(#g1)" opacity="0.7" />
      <rect x="44" y="30" width="4" height="4" rx="1" fill="url(#g1)" opacity="0.7" />
      <rect x="44" y="38" width="4" height="4" rx="1" fill="url(#g1)" opacity="0.7" />
      {/* Cut line */}
      <line x1="22" y1="27" x2="32" y2="27" stroke="url(#g1)" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
      {/* Cut diamond */}
      <rect x="24.5" y="24.5" width="5" height="5" rx="1" transform="rotate(45 27 27)" fill="url(#g1)" filter="url(#glow)" />
    </svg>
  );
}

function NoFileLoaded({ onClick, onUrlDownload }: {
  mifiLink: unknown,
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
        {/* Icon */}
        <motion.div
          animate={{ filter: dragging ? 'drop-shadow(0 0 18px rgba(210,255,0,0.5))' : 'drop-shadow(0 0 8px rgba(210,255,0,0.2))' }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 20 }}
        >
          <TrimIcon />
        </motion.div>

        <div className="kicko-kicker" style={{ marginBottom: 7 }}>KICKO</div>
        <div style={{
          fontSize: 36, fontWeight: 800, marginBottom: 10,
          color: '#edf5f7',
          lineHeight: 1,
        }}>
          TrimOut
        </div>

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
