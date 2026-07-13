import { FiDownload, FiFolderPlus, FiGrid, FiX } from 'react-icons/fi';

interface Props {
  visible: boolean;
  clipCount: number;
  hasProject: boolean;
  onDownload: () => void;
  onContinueInKicko: () => void;
  onClose: () => void;
}

export default function FinishDestinationDialog({ visible, clipCount, hasProject, onDownload, onContinueInKicko, onClose }: Props) {
  if (!visible) return null;

  return (
    <div className="kicko-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="kicko-dialog finish-destination-dialog" role="dialog" aria-modal="true" aria-labelledby="finish-destination-title">
        <header className="kicko-dialog-header">
          <div>
            <div className="kicko-kicker">FINISH</div>
            <h2 id="finish-destination-title">What would you like to do with {clipCount === 1 ? 'this clip' : `these ${clipCount} clips`}?</h2>
          </div>
          <button type="button" className="icon-button" title="Close" aria-label="Close" onClick={onClose}><FiX /></button>
        </header>
        <div className="kicko-dialog-body finish-destination-options">
          <button type="button" className="finish-destination-option" onClick={onDownload}>
            <FiDownload />
            <span><strong>Download to computer</strong><small>Use the familiar local export and keep the clips in your folder.</small></span>
          </button>
          <button type="button" className="finish-destination-option kicko" onClick={onContinueInKicko}>
            {hasProject ? <FiGrid /> : <FiFolderPlus />}
            <span>
              <strong>{hasProject ? 'Continue in KICKO' : 'Create a project for KICKO'}</strong>
              <small>{hasProject ? 'Export locally, then review, order and send only the plays you select.' : 'Start a local project so clips from this game and the next stay together.'}</small>
            </span>
          </button>
        </div>
        <footer className="kicko-dialog-footer finish-destination-note">
          Original game videos stay on this computer.
        </footer>
      </section>
    </div>
  );
}
