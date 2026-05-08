import { memo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
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

function NoFileLoaded({ mifiLink, currentCutSeg, onClick, darkMode, keyBindingByAction, onUrlDownload }: {
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
      {/* Ambient glow blobs */}
      <div style={{
        position: 'absolute', width: 340, height: 340, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)',
        top: '10%', left: '50%', transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)',
        bottom: '15%', left: '50%', transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }} />

      {/* Dashed border */}
      <motion.div
        animate={{ borderColor: dragging ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.07)' }}
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
          animate={{ filter: dragging ? 'drop-shadow(0 0 18px rgba(56,189,248,0.6))' : 'drop-shadow(0 0 8px rgba(56,189,248,0.25))' }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 20 }}
        >
          <TrimIcon />
        </motion.div>

        {/* Logo text */}
        <div style={{
          fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 10,
          background: 'linear-gradient(135deg, #f8fafc 30%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}>
          TrimOut
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 13.5, color: 'rgba(148,163,184,0.85)', marginBottom: 6,
          letterSpacing: '0.01em', textAlign: 'center',
        }}>
          Any video. Any moment. Any use.
        </div>

        {/* Sub tagline */}
        <div style={{
          fontSize: 11.5, color: 'rgba(100,116,139,0.8)', marginBottom: 36,
          textAlign: 'center', lineHeight: 1.7,
        }}>
          Instant lossless cuts — no rendering, no waiting, original quality.
        </div>

        {/* CTA button */}
        <motion.div
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: 68, height: 68, borderRadius: '50%', marginBottom: 18,
            background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(129,140,248,0.15))',
            border: '1.5px solid rgba(56,189,248,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, color: 'rgba(56,189,248,0.9)',
            boxShadow: '0 0 24px rgba(56,189,248,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
            cursor: 'pointer',
          }}
        >
          +
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
            border: `1px solid ${urlFocused ? 'rgba(56,189,248,0.5)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 10, padding: '6px 8px',
            transition: 'border-color 0.2s',
          }}>
            <span style={{ fontSize: 14 }}>🔗</span>
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
                color: '#e2e8f0', fontSize: 12.5, caretColor: '#38bdf8',
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
                    background: 'linear-gradient(135deg,rgba(56,189,248,0.25),rgba(129,140,248,0.25))',
                    border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8',
                    fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  Download ↓
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Info chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            '← → Frame step',
            'Drag handles to resize',
            'Add clips with +',
            'Export all at once',
          ].map((tip) => (
            <div key={tip} style={{
              fontSize: 10.5, color: 'rgba(100,116,139,0.75)',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 20, padding: '3px 10px',
              letterSpacing: '0.01em',
            }}>
              {tip}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default memo(NoFileLoaded);
