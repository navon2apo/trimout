import { memo, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FiLink, FiPlus, FiX } from 'react-icons/fi';
import type { StateSegment } from './types';
import type { KeyBinding } from '../../common/types';
import trimOutLogoUrl from './trimout-logo.png';
import { projectTitle } from './util/recentProjects';
import type { RecentProject } from './util/recentProjects';

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

const formatWhen = (ms: number) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const formatPos = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

function NoFileLoaded({ onClick, onUrlDownload, recentProjects, onOpenRecent, onForgetRecent, reopenLast, onReopenLastChange }: {
  currentCutSeg: StateSegment | undefined,
  onClick: () => void,
  recentProjects: RecentProject[],
  onOpenRecent: (project: RecentProject) => void,
  onForgetRecent: (mediaPath: string) => void,
  reopenLast: boolean,
  onReopenLastChange: (value: boolean) => void,
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
        animate={{ borderColor: dragging ? '#84cc16' : '#d0d5dd' }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute',
          inset: 16,
          borderRadius: 14,
          border: '1.5px dashed #d0d5dd',
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
            borderColor: dragging ? '#84cc16' : '#e4e7ec',
            boxShadow: dragging ? '0 0 0 4px rgba(132,204,22,0.2)' : '0 8px 24px rgba(15,23,42,0.08)',
          }}
          transition={{ duration: 0.3 }}
          style={{
            marginBottom: 24,
            padding: '12px 18px',
            border: '1px solid #e4e7ec',
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
          fontSize: 15,
          fontWeight: 600,
          color: '#0f172a',
          marginBottom: 6,
          letterSpacing: '0.01em',
          textAlign: 'center',
        }}
        >
          Find the moments that matter.
        </div>

        {/* Sub tagline */}
        <div style={{
          fontSize: 12.5,
          color: '#64748b',
          marginBottom: 36,
          textAlign: 'center',
          lineHeight: 1.7,
        }}
        >
          Cut and organize plays locally. Continue in KICKO when you are ready.
        </div>

        {/* CTA button */}
        <motion.div
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.97 }}
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            marginBottom: 18,
            background: '#d2ff00',
            border: '1.5px solid #b8e000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            color: '#0a1200',
            boxShadow: '0 6px 18px rgba(132,204,22,0.35)',
            cursor: 'pointer',
          }}
        >
          <FiPlus />
        </motion.div>

        {/* Action label */}
        <div style={{ fontSize: 13, color: '#334155', marginBottom: 16 }}>
          Click or drag a video file to get started
        </div>

        {/* URL input */}
        {/* Clicks in the URL box must not open the file picker behind it */}
        <div role="presentation" style={{ width: '100%', maxWidth: 340, marginBottom: 20 }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            background: '#ffffff',
            border: `1px solid ${urlFocused ? '#84cc16' : '#d0d5dd'}`,
            borderRadius: 10,
            padding: '6px 8px',
            transition: 'border-color 0.2s',
          }}
          >
            <FiLink style={{ color: '#4d7c0f' }} />
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
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#0f172a',
                fontSize: 12.5,
                caretColor: '#4d7c0f',
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
                    padding: '3px 12px',
                    borderRadius: 7,
                    background: '#d2ff00',
                    border: '1px solid #d2ff00',
                    color: '#071018',
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Download ↓
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Recent projects: click to continue where we stopped */}
        {recentProjects.length > 0 && (
          <div role="presentation" style={{ width: '100%', maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Recent projects</div>
            <div style={{ maxHeight: 190, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {recentProjects.map((project) => (
                <div
                  key={project.mediaPath}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #e4e7ec', borderRadius: 8 }}
                >
                  <button
                    type="button"
                    onClick={() => onOpenRecent(project)}
                    title={project.mediaPath}
                    style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer', color: '#0f172a' }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectTitle(project)}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {project.clipCount} {project.clipCount === 1 ? 'clip' : 'clips'} · {formatWhen(project.updatedAt)} · continue at {formatPos(project.playerTime)}
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label="Remove from the list"
                    title="Remove from the list (the files stay)"
                    onClick={() => onForgetRecent(project.mediaPath)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '6px 8px' }}
                  >
                    <FiX />
                  </button>
                </div>
              ))}
            </div>
            <label htmlFor="reopen-last-project" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11.5, color: '#475569', cursor: 'pointer' }}>
              <input id="reopen-last-project" type="checkbox" checked={reopenLast} onChange={(e) => onReopenLastChange(e.target.checked)} />
              <span>Open the last project when the app starts</span>
            </label>
          </div>
        )}

      </motion.div>
    </div>
  );
}

export default memo(NoFileLoaded);
