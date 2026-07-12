import { useState } from 'react';
import { FiCheck, FiExternalLink, FiLoader, FiLogIn, FiUploadCloud, FiX } from 'react-icons/fi';

import type { TrimoutProject } from '../projectModel';
import type { KickoConnection, KickoProjectSummary } from '../kickoBridge';
import { connectToKicko, listKickoProjects, sendProjectToKicko } from '../kickoBridge';

interface Props {
  visible: boolean;
  project: TrimoutProject | null;
  onClose: () => void;
}

type Phase = 'connect' | 'connecting' | 'choose' | 'uploading' | 'done' | 'error';

export default function KickoBridgeDialog({ visible, project, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('connect');
  const [connection, setConnection] = useState<KickoConnection | null>(null);
  const [projects, setProjects] = useState<KickoProjectSummary[]>([]);
  const [destination, setDestination] = useState('new');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [openUrl, setOpenUrl] = useState('');

  if (!visible || !project) return null;

  async function handleConnect() {
    setPhase('connecting');
    setError('');
    try {
      const nextConnection = await connectToKicko({ onCode: ({ userCode }) => setCode(userCode) });
      setConnection(nextConnection);
      setProjects(await listKickoProjects(nextConnection));
      setPhase('choose');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'KICKO connection failed.');
      setPhase('error');
    }
  }

  async function handleUpload() {
    if (!connection || !project) return;
    const projectToUpload = project;
    setPhase('uploading');
    setError('');
    try {
      const result = await sendProjectToKicko({
        connection,
        project: projectToUpload,
        destinationProjectId: destination === 'new' ? null : destination,
        onProgress: setProgress,
      });
      setOpenUrl(result.openUrl);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setPhase('error');
    }
  }

  function openKicko() {
    if (openUrl) window.require('electron').shell.openExternal(openUrl);
  }

  return (
    <div className="kicko-dialog-backdrop" role="presentation">
      <section className="kicko-dialog kicko-bridge-dialog" role="dialog" aria-modal="true" aria-labelledby="kicko-bridge-title">
        <header className="kicko-dialog-header">
          <div><div className="kicko-kicker">KICKO CLOUD</div><h2 id="kicko-bridge-title">Continue your project in KICKO</h2></div>
          <button type="button" className="icon-button" title="Close" aria-label="Close" onClick={onClose}><FiX /></button>
        </header>
        <div className="kicko-dialog-body bridge-body">
          {phase === 'connect' && <><p>Send only the selected plays, their order and categories. Your original game videos stay on this computer.</p><button type="button" className="primary-button" onClick={handleConnect}><FiLogIn /> Connect KICKO account</button></>}
          {phase === 'connecting' && <div className="bridge-state"><FiLoader className="spinner-animation" /><strong>Approve the connection in your browser</strong>{code && <code>{code}</code>}<span>This window will continue automatically after approval.</span></div>}
          {phase === 'choose' && <><label className="bridge-project-select" htmlFor="kicko-destination"><span>Send to</span><select id="kicko-destination" value={destination} onChange={(event) => setDestination(event.target.value)}><option value="new">Create a new KICKO project</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.title || 'Untitled project'}</option>)}</select></label><p>{project.plays.filter((play) => play.selected).length} selected plays will be added in the approved order.</p></>}
          {phase === 'uploading' && <div className="bridge-state"><FiUploadCloud /><strong>Uploading {progress.current} of {progress.total}</strong><span>{progress.fileName}</span><progress max={progress.total || 1} value={progress.current} /></div>}
          {phase === 'done' && <div className="bridge-state success"><FiCheck /><strong>Your KICKO project is ready</strong><span>Open it to select the player and add tracking effects.</span></div>}
          {phase === 'error' && <div className="bridge-state error"><strong>Connection stopped</strong><span>{error}</span><button type="button" className="secondary-button" onClick={() => { setPhase(connection ? 'choose' : 'connect'); setError(''); }}>Try again</button></div>}
        </div>
        <footer className="kicko-dialog-footer">
          {phase === 'choose' && <button type="button" className="primary-button" onClick={handleUpload}><FiUploadCloud /> Send selected plays</button>}
          {phase === 'done' && <button type="button" className="primary-button" onClick={openKicko}><FiExternalLink /> Open in KICKO</button>}
        </footer>
      </section>
    </div>
  );
}
