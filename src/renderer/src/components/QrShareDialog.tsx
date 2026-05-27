/**
 * QrShareDialog — shows a QR code that points to a local file-share URL.
 * Phone scans → downloads the file directly from the desktop app.
 *
 * Lifecycle:
 *   open  → invoke('qrShareStart', filePath) → get URL/token → render QR
 *   close → invoke('qrShareStop')
 *
 * Status updates stream from main via 'qrShareEvent' IPC.
 */
import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';

export type ShareStatus = 'ready' | 'downloading' | 'completed' | 'expired' | 'stopped' | 'error';

interface ShareSession {
  token: string;
  url: string;
  fileName: string;
  fileSize: number;
  port: number;
  expiresAt: number;
}

interface ShareEvent {
  status: ShareStatus;
  bytesSent?: number;
  totalBytes?: number;
  errorMessage?: string;
}

interface Props {
  visible: boolean;
  filePath: string | null;
  onClose: () => void;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const STATUS_TEXT_HE: Record<ShareStatus, string> = {
  ready: 'מוכן — סרוק את הקוד מהטלפון',
  downloading: 'הטלפון מוריד...',
  completed: 'ההורדה הושלמה ✓',
  expired: 'הקישור פג תוקף',
  stopped: 'השיתוף נעצר',
  error: 'אירעה שגיאה',
};

const STATUS_COLOR: Record<ShareStatus, string> = {
  ready: '#14b8a6',
  downloading: '#38bdf8',
  completed: '#22c55e',
  expired: '#94a3b8',
  stopped: '#94a3b8',
  error: '#ef4444',
};

function QrShareDialog({ visible, filePath, onClose }: Props) {
  const [session, setSession] = useState<ShareSession | null>(null);
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const [bytesSent, setBytesSent] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const startedRef = useRef<boolean>(false);

  // Start session whenever the dialog opens with a file
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!visible || !filePath) return undefined;
    if (startedRef.current) return undefined;
    startedRef.current = true;

    /* eslint-disable react-hooks/set-state-in-effect */
    // Reset state — these resets are intentional when the dialog opens with a new file
    setSession(null);
    setStatus(null);
    setBytesSent(0);
    setTotalBytes(0);
    setErrorMsg(null);
    setQrDataUrl(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    const { ipcRenderer } = window.require('electron');

    const onEvent = (_: unknown, e: ShareEvent) => {
      setStatus(e.status);
      if (e.bytesSent != null) setBytesSent(e.bytesSent);
      if (e.totalBytes != null) setTotalBytes(e.totalBytes);
      if (e.errorMessage) setErrorMsg(e.errorMessage);
    };
    ipcRenderer.on('qrShareEvent', onEvent);

    (async () => {
      try {
        const s: ShareSession = await ipcRenderer.invoke('qrShareStart', filePath);
        setSession(s);
        setTotalBytes(s.fileSize);
        const qr = await QRCode.toDataURL(s.url, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 360,
          color: { dark: '#0a0f19', light: '#ffffff' },
        });
        setQrDataUrl(qr);
      } catch (err) {
        console.error('qrShare start failed', err);
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      ipcRenderer.removeListener('qrShareEvent', onEvent);
    };
  }, [visible, filePath]);

  // Cleanup on close
  useEffect(() => {
    if (visible) return;
    if (!startedRef.current) return;
    startedRef.current = false;
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('qrShareStop');
    } catch (err) { console.warn('qrShareStop failed', err); }
  }, [visible]);

  // Countdown
  useEffect(() => {
    if (!session) return undefined;
    const tick = () => setTimeLeftMs(Math.max(0, session.expiresAt - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const handleStop = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('qrShareStop');
    } catch { /* ignore */ }
    onClose();
  };

  const handleCopyUrl = () => {
    if (!session) return;
    navigator.clipboard.writeText(session.url).catch(() => { /* ignore */ });
  };

  const downloadProgress = totalBytes > 0 ? Math.round((bytesSent / totalBytes) * 100) : 0;
  const effectiveStatus: ShareStatus = status ?? 'ready';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 440,
              maxWidth: '94vw',
              background: 'rgba(13,17,27,0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
              direction: 'rtl',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>📱 שלח לטלפון</div>
                <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)' }}>סרוק את הקוד עם מצלמת הטלפון</div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="סגור"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(148,163,184,0.7)',
                  fontSize: 20,
                  padding: '4px 10px',
                }}
              >
                ✕
              </button>
            </div>

            {/* QR area */}
            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              {qrDataUrl ? (
                <div style={{ padding: 14, background: '#ffffff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <img src={qrDataUrl} alt="QR Code" style={{ display: 'block', width: 240, height: 240 }} />
                </div>
              ) : (
                <div style={{ width: 268, height: 268, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 12, color: 'rgba(148,163,184,0.6)', fontSize: 13 }}>
                  {effectiveStatus === 'error' ? '⚠ שגיאה' : 'מכין QR...'}
                </div>
              )}

              {/* File info */}
              {session && (
                <div style={{ width: '100%', textAlign: 'center' }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: '#f1f5f9',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                    }}
                    title={session.fileName}
                  >
                    {session.fileName}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(148,163,184,0.6)', marginTop: 2 }}>
                    {formatBytes(session.fileSize)} · פג תוקף בעוד {formatTimeLeft(timeLeftMs)}
                  </div>
                </div>
              )}
            </div>

            {/* Status strip */}
            <div style={{
              padding: '10px 22px',
              background: 'rgba(255,255,255,0.02)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: STATUS_COLOR[effectiveStatus],
                  boxShadow: `0 0 8px ${STATUS_COLOR[effectiveStatus]}`,
                  flexShrink: 0,
                  animation: effectiveStatus === 'ready' ? 'pulse 1.5s ease-in-out infinite' : undefined,
                }}
                />
                <div style={{ fontSize: 12.5, fontWeight: 600, color: STATUS_COLOR[effectiveStatus], flex: 1 }}>
                  {STATUS_TEXT_HE[effectiveStatus]}
                </div>
                {effectiveStatus === 'downloading' && (
                  <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.8)', fontVariantNumeric: 'tabular-nums' }}>
                    {downloadProgress}% · {formatBytes(bytesSent)}
                  </div>
                )}
              </div>
              {effectiveStatus === 'downloading' && (
                <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${downloadProgress}%`, background: STATUS_COLOR.downloading, transition: 'width 0.3s' }} />
                </div>
              )}
              {errorMsg && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#fca5a5' }}>{errorMsg}</div>
              )}
            </div>

            {/* Help text */}
            <div style={{ padding: '12px 22px', fontSize: 11, color: 'rgba(148,163,184,0.6)', lineHeight: 1.6 }}>
              💡 הטלפון והמחשב חייבים להיות באותה רשת (WiFi או חיבור קווי). אם הסריקה לא עובדת — בדוק את חומת האש של Windows.
            </div>

            {/* Footer actions */}
            <div style={{
              padding: '12px 16px 14px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              gap: 8,
              justifyContent: 'space-between',
            }}
            >
              <button
                type="button"
                onClick={handleCopyUrl}
                disabled={!session}
                title="העתק קישור (לשלוח דרך WhatsApp / Telegram)"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 7,
                  color: 'rgba(203,213,225,0.85)',
                  fontSize: 12,
                  padding: '7px 14px',
                  cursor: session ? 'pointer' : 'not-allowed',
                  opacity: session ? 1 : 0.5,
                }}
              >
                📋 העתק קישור
              </button>
              <button
                type="button"
                onClick={handleStop}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: 7,
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  padding: '7px 22px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                }}
              >
                🛑 עצור שיתוף
              </button>
            </div>

            <style>{'@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }'}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(QrShareDialog);
