/**
 * LicenseGate — shown before the main UI if TrimOut is not activated.
 * Displays the machine ID so the user knows it before purchasing,
 * then accepts a license key and calls the activation API.
 */
import { useState } from 'react';

interface Props {
  machineId: string;
  onActivated: () => void;
}

export default function LicenseGate({ machineId, onActivated }: Props) {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleActivate() {
    const trimmedKey = key.trim().toUpperCase();
    if (!trimmedKey) return;
    setStatus('loading');
    setError('');
    try {
      const result = await window.electron.activateLicense(trimmedKey);
      if (result.ok) {
        onActivated();
      } else {
        setError(result.error ?? 'Activation failed. Check your key and try again.');
        setStatus('error');
      }
    } catch {
      setError('Unexpected error. Please restart the app.');
      setStatus('error');
    }
  }

  function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Auto-format: TRIM-XXXX-XXXX-XXXX-XXXX
    let val = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (val.length > 4 && !val.startsWith('TRIM')) {
      // Allow freeform for pasting full formatted key
    }
    // Apply dashes at positions 4, 8, 12, 16
    const parts: string[] = [];
    for (let i = 0; i < val.length && parts.join('').length < 20; i += 4) {
      parts.push(val.slice(i, i + 4));
    }
    setKey(parts.join('-'));
  }

  const isLoading = status === 'loading';
  const isReady = key.trim().length > 0 && !isLoading;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(145deg, #0c1220 0%, #0f172a 50%, #111827 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: '#f1f5f9',
      zIndex: 9999,
      userSelect: 'none',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 24,
        padding: '52px 44px',
        maxWidth: 500,
        width: '92%',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
      }}>

        {/* Logo & title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 12 }}>✂️</div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', color: '#f8fafc' }}>
            TrimOut
          </div>
          <div style={{ fontSize: 14, color: 'rgba(148,163,184,0.65)', marginTop: 6, letterSpacing: '0.02em' }}>
            AI-powered video editor · License required
          </div>
        </div>

        {/* Machine ID display */}
        <div style={{
          background: 'rgba(56,189,248,0.06)',
          border: '1px solid rgba(56,189,248,0.18)',
          borderRadius: 14,
          padding: '18px 22px',
        }}>
          <div style={{
            fontSize: 11.5,
            color: 'rgba(56,189,248,0.7)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: 8,
            fontWeight: 600,
          }}>
            🖥️ Your machine ID
          </div>
          <div style={{
            fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
            fontSize: 13,
            color: '#7dd3fc',
            wordBreak: 'break-all',
            letterSpacing: '0.06em',
            lineHeight: 1.6,
          }}>
            {machineId}
          </div>
          <div style={{
            fontSize: 11.5,
            color: 'rgba(100,116,139,0.7)',
            marginTop: 10,
            lineHeight: 1.5,
          }}>
            This ID identifies your machine. Each license works on up to <strong style={{ color: 'rgba(148,163,184,0.8)' }}>2 machines</strong>. Share this ID before purchasing if you'd like to confirm compatibility.
          </div>
        </div>

        {/* Key input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'rgba(203,213,225,0.85)',
          }}>
            License key
          </label>
          <input
            value={key}
            onChange={handleKeyChange}
            onKeyDown={(e) => e.key === 'Enter' && isReady && handleActivate()}
            placeholder="TRIM-XXXX-XXXX-XXXX-XXXX"
            disabled={isLoading}
            autoFocus
            spellCheck={false}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${status === 'error' ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.14)'}`,
              borderRadius: 12,
              padding: '13px 18px',
              fontSize: 16,
              fontFamily: 'ui-monospace, "Cascadia Code", monospace',
              color: '#f1f5f9',
              outline: 'none',
              letterSpacing: '0.12em',
              transition: 'border-color 0.15s',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
          {status === 'error' && error && (
            <div style={{
              fontSize: 12.5,
              color: 'rgba(248,113,113,0.9)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 6,
              lineHeight: 1.5,
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Activate button */}
        <button
          type="button"
          onClick={handleActivate}
          disabled={!isReady}
          style={{
            background: isLoading
              ? 'rgba(14,165,233,0.25)'
              : isReady
                ? 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)'
                : 'rgba(255,255,255,0.06)',
            border: 'none',
            borderRadius: 14,
            padding: '15px',
            fontSize: 15.5,
            fontWeight: 650,
            color: isReady ? '#fff' : 'rgba(148,163,184,0.4)',
            cursor: isReady ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
            boxShadow: isReady && !isLoading ? '0 4px 20px rgba(14,165,233,0.3)' : 'none',
            letterSpacing: '0.01em',
          }}
        >
          {isLoading ? '⏳  Activating...' : '🔑  Activate TrimOut'}
        </button>

        {/* Purchase link */}
        <div style={{ textAlign: 'center', fontSize: 12.5, color: 'rgba(100,116,139,0.65)', lineHeight: 1.6 }}>
          Don't have a license?{' '}
          <a
            href="https://trimout.gumroad.com/l/trimout"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}
            onClick={(e) => {
              e.preventDefault();
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              window.require('electron').shell.openExternal('https://trimout.gumroad.com/l/trimout');
            }}
          >
            Purchase at trimout.gumroad.com →
          </a>
          <br />
          <span style={{ fontSize: 11.5 }}>
            Solo $29 · Pro $49 (2 machines) · One-time payment, no subscription
          </span>
        </div>
      </div>
    </div>
  );
}
