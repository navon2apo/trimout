import { useState } from 'react';
import type { ReactNode } from 'react';
import { FiArrowLeft, FiDownload, FiFolderPlus, FiGrid, FiX } from 'react-icons/fi';

type Step = 'choose' | 'download';

interface Props {
  visible: boolean;
  clipCount: number;
  hasProject: boolean;
  // Export settings, shown only once the user picked "Download to computer"
  downloadOptions: ReactNode;
  initialStep?: Step;
  onDownload: () => void;
  onContinueInKicko: () => void;
  onClose: () => void;
}

export default function FinishDestinationDialog({ visible, clipCount, hasProject, downloadOptions, initialStep = 'choose', onDownload, onContinueInKicko, onClose }: Props) {
  const [step, setStep] = useState<Step>(initialStep);
  const [wasVisible, setWasVisible] = useState(visible);

  // Every time the dialog opens, start again from the destination choice.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setStep(initialStep);
  }

  if (!visible) return null;

  const clipsLabel = clipCount === 1 ? '1 clip' : `${clipCount} clips`;

  return (
    <div className="kicko-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="kicko-dialog finish-destination-dialog" role="dialog" aria-modal="true" aria-labelledby="finish-destination-title">
        <header className="kicko-dialog-header">
          <div>
            <div className="kicko-kicker">FINISH</div>
            <h2 id="finish-destination-title">
              {step === 'choose'
                ? `What would you like to do with ${clipCount === 1 ? 'this clip' : `these ${clipCount} clips`}?`
                : 'Download to computer'}
            </h2>
          </div>
          <button type="button" className="icon-button" title="Close" aria-label="Close" onClick={onClose}><FiX /></button>
        </header>

        {step === 'choose' ? (
          <div className="kicko-dialog-body finish-destination-options">
            <button type="button" className="finish-destination-option" onClick={() => setStep('download')}>
              <FiDownload />
              <span><strong>Download to computer</strong><small>Save the clips to a folder on this computer, named by the play.</small></span>
            </button>
            <button type="button" className="finish-destination-option kicko" onClick={onContinueInKicko}>
              {hasProject ? <FiGrid /> : <FiFolderPlus />}
              <span>
                <strong>{hasProject ? 'Continue in KICKO' : 'Create a project for KICKO'}</strong>
                <small>{hasProject ? 'Export locally, then review, order and send only the plays you select.' : 'Start a local project so clips from this game and the next stay together.'}</small>
              </span>
            </button>
          </div>
        ) : (
          <div className="kicko-dialog-body">
            {downloadOptions}
          </div>
        )}

        {step === 'choose' ? (
          <footer className="kicko-dialog-footer finish-destination-note">
            Original game videos stay on this computer.
          </footer>
        ) : (
          <footer className="kicko-dialog-footer">
            <button type="button" className="finish-back-button" onClick={() => setStep('choose')}><FiArrowLeft /> Back</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="finish-download-button" onClick={onDownload}><FiDownload /> Download {clipsLabel}</button>
          </footer>
        )}
      </section>
    </div>
  );
}
