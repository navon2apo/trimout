/**
 * LegalDialog — combined Terms of Service + Privacy Policy modal.
 * Embedded in the app (no external page) so it works offline.
 * Triggered from the top-right ⚙ menu.
 */
import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Tab = 'terms' | 'privacy';

const SECTION_STYLE: React.CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.6,
  color: 'rgba(203,213,225,0.9)',
  marginBottom: 14,
};

const H_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#e2e8f0',
  marginBottom: 6,
  marginTop: 14,
};

function TermsContent() {
  return (
    <div style={{ direction: 'ltr' }}>
      <p style={SECTION_STYLE}>
        Welcome to TrimOut. By using the app, you agree to the following terms.
      </p>

      <h3 style={H_STYLE}>1. License</h3>
      <p style={SECTION_STYLE}>
        Purchasing TrimOut grants you a personal, non-exclusive license to install
        and use the app on your computers. You may not distribute, sell, or transfer
        your license key to others.
      </p>

      <h3 style={H_STYLE}>2. Content Use</h3>
      <p style={SECTION_STYLE}>
        You are solely responsible for the content you import and edit in the app.
        You must make sure you have the required rights to use the video files and
        consent from anyone appearing in them, especially when minors are involved.
      </p>

      <h3 style={H_STYLE}>3. Limitation of Liability</h3>
      <p style={SECTION_STYLE}>
        TrimOut is provided &quot;as is&quot;. We are not responsible for data loss,
        damaged files, or indirect damage caused by using the software. Keep backup
        copies of your original files before editing.
      </p>

      <h3 style={H_STYLE}>4. Third-Party Components</h3>
      <p style={SECTION_STYLE}>
        TrimOut is based on LosslessCut by Mikael Finstad (GPL-2.0 license) and
        uses FFmpeg. Third-party components are governed by their own licenses.
      </p>

      <h3 style={H_STYLE}>5. Updates and Service Availability</h3>
      <p style={SECTION_STYLE}>
        We may release updates from time to time. Online services are not guaranteed
        to remain available. The core app works locally and does not require an
        internet connection for basic editing.
      </p>

      <h3 style={H_STYLE}>6. Support</h3>
      <p style={SECTION_STYLE}>
        For issues and requests, contact: info@demente-show.com
      </p>

      <p style={{ ...SECTION_STYLE, fontSize: 11, color: 'rgba(148,163,184,0.6)', marginTop: 18 }}>
        Last updated: 2026
      </p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div style={{ direction: 'ltr' }}>
      <p style={SECTION_STYLE}>
        TrimOut respects your privacy. This document explains what data is collected
        and what is not.
      </p>

      <h3 style={H_STYLE}>1. Local Processing Only</h3>
      <p style={SECTION_STYLE}>
        All video editing happens on your computer. Your video files, generated
        clips, names, and selected actions <strong>are not sent to any external server</strong>.
      </p>

      <h3 style={H_STYLE}>2. Locally Stored Data</h3>
      <p style={SECTION_STYLE}>
        The app stores the following on your computer:
        <br />- User settings, such as export folder and preferred quality
        <br />- Software license data
        <br />- A metadata.json file next to exports, if you choose to create one
      </p>

      <h3 style={H_STYLE}>3. License Check</h3>
      <p style={SECTION_STYLE}>
        On first launch, TrimOut may verify your license with the distribution
        server. Only the license key, device identifier hash, and app version are
        sent. No additional personal information is collected.
      </p>

      <h3 style={H_STYLE}>4. Update Checks</h3>
      <p style={SECTION_STYLE}>
        The app may occasionally check whether a new version is available. This
        check is anonymous and not personally identifying.
      </p>

      <h3 style={H_STYLE}>5. Cookies and Tracking</h3>
      <p style={SECTION_STYLE}>
        There are no cookies, no analytics, and no third-party services tracking
        your app usage.
      </p>

      <h3 style={H_STYLE}>6. Children</h3>
      <p style={SECTION_STYLE}>
        TrimOut is intended for users aged 13 and older. When editing videos of
        children, make sure you have the appropriate parental authority to share
        the resulting files.
      </p>

      <h3 style={H_STYLE}>7. Contact</h3>
      <p style={SECTION_STYLE}>
        For privacy questions: info@demente-show.com
      </p>

      <p style={{ ...SECTION_STYLE, fontSize: 11, color: 'rgba(148,163,184,0.6)', marginTop: 18 }}>
        Last updated: 2026
      </p>
    </div>
  );
}

function LegalDialog({ visible, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('terms');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
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
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 560,
              maxWidth: '94vw',
              maxHeight: '86vh',
              background: 'rgba(13,17,27,0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header with tabs */}
            <div style={{
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
            }}
            >
              {(['terms', 'privacy'] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: tab === t ? '#e2e8f0' : 'rgba(148,163,184,0.65)',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '14px 16px',
                    borderBottom: `2px solid ${tab === t ? '#14b8a6' : 'transparent'}`,
                    transition: 'color 0.12s, border-color 0.12s',
                  }}
                >
                  {t === 'terms' ? 'Terms' : 'Privacy'}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(148,163,184,0.7)',
                  fontSize: 20,
                  padding: '6px 12px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px 22px 22px',
            }}
            >
              {tab === 'terms' ? <TermsContent /> : <PrivacyContent />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(LegalDialog);
