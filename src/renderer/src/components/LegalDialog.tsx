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
        Welcome to KICKO TrimOut. By using the app, you agree to the following terms.
      </p>

      <h3 style={H_STYLE}>1. Open-Source License</h3>
      <p style={SECTION_STYLE}>
        KICKO TrimOut is free to download and use under the GNU General Public License
        version 2. The corresponding source code and license notice are available from
        the TrimOut source repository.
      </p>

      <h3 style={H_STYLE}>2. Optional KICKO Cloud Service</h3>
      <p style={SECTION_STYLE}>
        Local editing does not require a KICKO account. Continuing a project in KICKO is
        optional and requires an eligible KICKO account. KICKO subscriptions and cloud
        services are governed by their separate account and service terms.
      </p>

      <h3 style={H_STYLE}>3. Content Use</h3>
      <p style={SECTION_STYLE}>
        You are solely responsible for the content you import and edit in the app.
        You must make sure you have the required rights to use the video files and
        consent from anyone appearing in them, especially when minors are involved.
      </p>

      <h3 style={H_STYLE}>4. Limitation of Liability</h3>
      <p style={SECTION_STYLE}>
        KICKO TrimOut is provided &quot;as is&quot;. We are not responsible for data loss,
        damaged files, or indirect damage caused by using the software. Keep backup
        copies of your original files before editing.
      </p>

      <h3 style={H_STYLE}>5. Third-Party Components</h3>
      <p style={SECTION_STYLE}>
        KICKO TrimOut is based on LosslessCut by Mikael Finstad (GPL-2.0 license) and
        uses FFmpeg. Third-party components are governed by their own licenses.
      </p>

      <h3 style={H_STYLE}>6. Updates and Service Availability</h3>
      <p style={SECTION_STYLE}>
        We may release updates from time to time. Online services are not guaranteed
        to remain available. The core app works locally and does not require an
        internet connection for basic editing.
      </p>

      <h3 style={H_STYLE}>7. Support</h3>
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
        KICKO TrimOut respects your privacy. This document explains what data is collected
        and what is not.
      </p>

      <h3 style={H_STYLE}>1. Local Editing by Default</h3>
      <p style={SECTION_STYLE}>
        Video selection, cutting, categorization, and local export happen on your
        computer. Original game videos remain local unless you independently upload
        them elsewhere.
      </p>

      <h3 style={H_STYLE}>2. Locally Stored Data</h3>
      <p style={SECTION_STYLE}>
        The app stores the following on your computer:
        <br />- User settings, such as export folder and preferred quality
        <br />- TrimOut project files and local file references
        <br />- Export metadata, when created as part of your project
      </p>

      <h3 style={H_STYLE}>3. Optional KICKO Transfer</h3>
      <p style={SECTION_STYLE}>
        Nothing is uploaded to KICKO until you choose the KICKO destination, sign in,
        approve the connection, and start the transfer. TrimOut then sends only the
        selected rendered clips and the project metadata needed to preserve their
        names, categories, and order. KICKO stores and processes that data under the
        privacy terms for your KICKO account.
      </p>

      <h3 style={H_STYLE}>4. Optional Online Features</h3>
      <p style={SECTION_STYLE}>
        Features such as downloading a video from a URL, cloud transcription, or
        continuing in KICKO require a network connection and send the information
        needed to the service you explicitly choose. TrimOut does not perform an
        automatic software update check.
      </p>

      <h3 style={H_STYLE}>5. Cookies and Tracking</h3>
      <p style={SECTION_STYLE}>
        The desktop app does not use cookies or analytics to track local editing.
        KICKO and other optional online services may process account and request data
        according to their own privacy policies.
      </p>

      <h3 style={H_STYLE}>6. Children</h3>
      <p style={SECTION_STYLE}>
        KICKO TrimOut is intended for users aged 13 and older. When editing videos of
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
                    borderBottom: `2px solid ${tab === t ? '#d2ff00' : 'transparent'}`,
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
