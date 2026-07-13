import { useEffect, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheck,
  FiCreditCard,
  FiExternalLink,
  FiLoader,
  FiLogIn,
  FiRefreshCw,
  FiShield,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';

import type { TrimoutProject } from '../projectModel';
import type { KickoConnection, KickoProjectSummary, KickoTransferProgress } from '../kickoBridge';
import {
  DEFAULT_KICKO_BASE_URL,
  cancelKickoTransfer,
  connectToKicko,
  forgetKickoHandoff,
  listKickoProjects,
  resumeKickoHandoff,
  sendProjectToKicko,
} from '../kickoBridge';

interface Props {
  visible: boolean;
  project: TrimoutProject | null;
  onClose: (reason: 'cancelled' | 'done') => void;
}

type Phase = 'checking_resume' | 'connect' | 'connecting' | 'choose' | 'transferring' | 'cancelling' | 'subscription_required' | 'done' | 'error';
type RetryTarget = 'connect' | 'projects' | 'upload' | 'cancel';

const EMPTY_PROGRESS: KickoTransferProgress = { phase: 'preparing', current: 0, total: 0, fileName: '' };

function readFailure(error: unknown) {
  const code = String((error as { code?: unknown } | null)?.code || '').toLowerCase();
  return {
    message: error instanceof Error ? error.message : 'KICKO connection failed.',
    subscriptionRequired: code.includes('subscription'),
  };
}

export function getKickoProgressCopy(progress: KickoTransferProgress) {
  const total = Math.max(0, progress.total);
  const item = total > 0 ? Math.min(total, Math.max(1, progress.current + (progress.current < total ? 1 : 0))) : 0;
  if (progress.phase === 'uploading') return { title: `Uploading play ${item} of ${total}`, detail: 'Only this exported play is leaving your computer.' };
  if (progress.phase === 'validating') {
    return progress.current >= total
      ? { title: `Validated ${total} of ${total} plays`, detail: 'Every uploaded file passed KICKO validation.' }
      : { title: `Validating play ${item} of ${total}`, detail: 'KICKO is checking the uploaded file before it can enter a project.' };
  }
  if (progress.phase === 'finalizing') return { title: 'Finishing your KICKO project', detail: 'All selected plays are validated. KICKO is preserving their approved order.' };
  return { title: total > 0 ? `Checking play ${item} of ${total} locally` : 'Checking selected plays locally', detail: 'Nothing is being uploaded yet.' };
}

export function getKickoDestinationCapacity({ destination, projects, clipsPerProject, selectedCount }: {
  destination: string;
  projects: KickoProjectSummary[];
  clipsPerProject: number | null | undefined;
  selectedCount: number;
}) {
  const existingClipCount = destination === 'new'
    ? 0
    : projects.find((item) => item.id === destination)?.clipCount;
  if (clipsPerProject == null || existingClipCount == null) {
    return { exceeded: false, existingClipCount: existingClipCount ?? 0, remaining: null };
  }
  const remaining = Math.max(0, clipsPerProject - existingClipCount);
  return { exceeded: selectedCount > remaining, existingClipCount, remaining };
}

export function getKickoProjectOptionLabel(
  project: KickoProjectSummary,
  clipsPerProject: number | null | undefined,
) {
  const title = project.title || 'Untitled project';
  if (project.clipCount == null) return title;
  if (clipsPerProject == null) return `${title} (${project.clipCount} plays)`;
  return `${title} (${project.clipCount} of ${clipsPerProject} plays)`;
}

export default function KickoBridgeDialog({ visible, project, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('checking_resume');
  const [connection, setConnection] = useState<KickoConnection | null>(null);
  const [projects, setProjects] = useState<KickoProjectSummary[]>([]);
  const [clipsPerProject, setClipsPerProject] = useState<number | null | undefined>(undefined);
  const [destination, setDestination] = useState('new');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [retryTarget, setRetryTarget] = useState<RetryTarget>('connect');
  const [progress, setProgress] = useState<KickoTransferProgress>(EMPTY_PROGRESS);
  const [openUrl, setOpenUrl] = useState('');
  const projectRef = useRef(project);
  const abortControllerRef = useRef<AbortController | null>(null);
  const operationIdRef = useRef<string | null>(null);
  const runIdRef = useRef(0);
  const cloudStartedRef = useRef(false);
  projectRef.current = project;
  const projectId = project?.id;

  function resetDialog() {
    setPhase('connect');
    setConnection(null);
    setProjects([]);
    setClipsPerProject(undefined);
    setDestination('new');
    setCode('');
    setError('');
    setRetryTarget('connect');
    setProgress(EMPTY_PROGRESS);
    setOpenUrl('');
    operationIdRef.current = null;
    cloudStartedRef.current = false;
  }

  function showFailure(value: unknown, retry: RetryTarget) {
    const failure = readFailure(value);
    setError(failure.message);
    setRetryTarget(retry);
    setPhase(failure.subscriptionRequired ? 'subscription_required' : 'error');
  }

  useEffect(() => {
    if (!visible || !projectId) return undefined;
    const activeProject = projectRef.current;
    if (!activeProject) return undefined;
    const controller = new AbortController();
    runIdRef.current += 1;
    const runId = runIdRef.current;
    abortControllerRef.current = controller;
    operationIdRef.current = null;
    cloudStartedRef.current = false;
    setPhase('checking_resume');
    setConnection(null);
    setProjects([]);
    setClipsPerProject(undefined);
    setDestination('new');
    setCode('');
    setError('');
    setProgress(EMPTY_PROGRESS);
    setOpenUrl('');

    (async () => {
      try {
        const resumed = await resumeKickoHandoff({
          project: activeProject,
          signal: controller.signal,
          onConnection: (value) => { if (runId === runIdRef.current) setConnection(value); },
          onCode: ({ userCode }) => {
            if (runId !== runIdRef.current) return;
            setCode(userCode);
            setPhase('connecting');
          },
          onProgress: (value) => { if (runId === runIdRef.current) setProgress(value); },
        });
        if (runId !== runIdRef.current || controller.signal.aborted) return;
        if (!resumed) {
          setPhase('connect');
          return;
        }
        setConnection(resumed);
        const resumedProjects = await listKickoProjects(resumed, undefined, controller.signal);
        if (runId === runIdRef.current && !controller.signal.aborted) {
          setProjects(resumedProjects.projects);
          setClipsPerProject(resumedProjects.clipsPerProject);
          setPhase('choose');
        }
      } catch (value) {
        if (runId === runIdRef.current && !controller.signal.aborted) {
          const failure = readFailure(value);
          setError(failure.message);
          setRetryTarget('connect');
          setPhase(failure.subscriptionRequired ? 'subscription_required' : 'error');
        }
      } finally {
        if (abortControllerRef.current === controller) abortControllerRef.current = null;
      }
    })();

    return () => {
      controller.abort();
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    };
  }, [projectId, visible]);

  if (!visible || !project) return null;

  async function handleConnect() {
    const activeProject = projectRef.current;
    if (!activeProject) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    runIdRef.current += 1;
    const runId = runIdRef.current;
    abortControllerRef.current = controller;
    operationIdRef.current = null;
    cloudStartedRef.current = false;
    setPhase('connecting');
    setConnection(null);
    setProjects([]);
    setClipsPerProject(undefined);
    setCode('');
    setError('');
    setProgress(EMPTY_PROGRESS);
    try {
      const nextConnection = await connectToKicko({
        project: activeProject,
        signal: controller.signal,
        onConnection: (value) => { if (runId === runIdRef.current) setConnection(value); },
        onCode: ({ userCode }) => { if (runId === runIdRef.current) setCode(userCode); },
        onProgress: (value) => { if (runId === runIdRef.current) setProgress(value); },
      });
      if (runId !== runIdRef.current || controller.signal.aborted) return;
      setConnection(nextConnection);
      try {
        const nextProjects = await listKickoProjects(nextConnection, undefined, controller.signal);
        if (runId === runIdRef.current && !controller.signal.aborted) {
          setProjects(nextProjects.projects);
          setClipsPerProject(nextProjects.clipsPerProject);
          setPhase('choose');
        }
      } catch (value) {
        if (runId === runIdRef.current && !controller.signal.aborted) showFailure(value, 'projects');
      }
    } catch (value) {
      if (runId === runIdRef.current && !controller.signal.aborted) showFailure(value, 'connect');
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }

  async function handleReloadProjects() {
    if (!connection) return handleConnect();
    const controller = new AbortController();
    runIdRef.current += 1;
    const runId = runIdRef.current;
    abortControllerRef.current = controller;
    setPhase('connecting');
    setCode('');
    setError('');
    try {
      const nextProjects = await listKickoProjects(connection, undefined, controller.signal);
      if (runId === runIdRef.current && !controller.signal.aborted) {
        setProjects(nextProjects.projects);
        setClipsPerProject(nextProjects.clipsPerProject);
        setPhase('choose');
      }
    } catch (value) {
      if (runId === runIdRef.current && !controller.signal.aborted) showFailure(value, 'projects');
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
    return undefined;
  }

  async function handleUpload() {
    const activeProject = projectRef.current;
    if (!connection || !activeProject) return;
    const selectedCount = activeProject.plays.filter((play) => play.selected).length;
    if (getKickoDestinationCapacity({ destination, projects, clipsPerProject, selectedCount }).exceeded) return;
    const controller = new AbortController();
    runIdRef.current += 1;
    const runId = runIdRef.current;
    abortControllerRef.current = controller;
    cloudStartedRef.current = true;
    operationIdRef.current = null;
    setPhase('transferring');
    setError('');
    try {
      const result = await sendProjectToKicko({
        connection,
        project: activeProject,
        destinationProjectId: destination === 'new' ? null : destination,
        signal: controller.signal,
        onProgress: (value) => {
          if (runId !== runIdRef.current) return;
          operationIdRef.current = value.operationId || null;
          setProgress(value);
        },
      });
      if (runId !== runIdRef.current || controller.signal.aborted) return;
      operationIdRef.current = null;
      cloudStartedRef.current = false;
      setOpenUrl(result.openUrl);
      setPhase('done');
    } catch (value) {
      if (runId === runIdRef.current && !controller.signal.aborted) showFailure(value, 'upload');
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }
  }

  async function handleFreshConnection() {
    if (connection) await forgetKickoHandoff(connection).catch(() => false);
    setConnection(null);
    await handleConnect();
  }

  async function handleClose() {
    if (phase === 'cancelling') return;
    const closeReason = phase === 'done' ? 'done' : 'cancelled';
    runIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    const currentConnection = connection;
    const requiresRollback = Boolean(currentConnection && (
      phase === 'choose'
      || phase === 'transferring'
      || (phase === 'error' && cloudStartedRef.current)
    ));
    if (currentConnection && phase !== 'done') {
      if (requiresRollback) {
        setPhase('cancelling');
        try {
          await cancelKickoTransfer(currentConnection, operationIdRef.current);
        } catch {
          setError('KICKO could not confirm rollback. Your local project is safe; keep this window open and try cancelling again.');
          setRetryTarget('cancel');
          setPhase('error');
          return;
        }
      } else {
        await forgetKickoHandoff(currentConnection).catch(() => false);
      }
    }
    resetDialog();
    onClose(closeReason);
  }

  async function handleRetry() {
    if (retryTarget === 'upload') return handleUpload();
    if (retryTarget === 'projects') return handleReloadProjects();
    if (retryTarget === 'cancel') return handleClose();
    return handleConnect();
  }

  function openKicko() {
    if (openUrl) window.require('electron').shell.openExternal(openUrl);
  }

  function openPricing() {
    const baseUrl = connection?.baseUrl || DEFAULT_KICKO_BASE_URL;
    window.require('electron').shell.openExternal(new URL('/mvp/pricing.html', baseUrl).toString());
  }

  const selectedCount = project.plays.filter((play) => play.selected).length;
  const destinationCapacity = getKickoDestinationCapacity({ destination, projects, clipsPerProject, selectedCount });
  const progressCopy = getKickoProgressCopy(progress);
  const closeDisabled = phase === 'cancelling';

  return (
    <div className="kicko-dialog-backdrop" role="presentation">
      <section className="kicko-dialog kicko-bridge-dialog" role="dialog" aria-modal="true" aria-labelledby="kicko-bridge-title">
        <header className="kicko-dialog-header">
          <div><div className="kicko-kicker">KICKO CLOUD</div><h2 id="kicko-bridge-title">Continue your project in KICKO</h2></div>
          <button type="button" className="icon-button" title="Close" aria-label="Close" disabled={closeDisabled} onClick={() => handleClose()}><FiX /></button>
        </header>
        <div className="kicko-dialog-body bridge-body" aria-live="polite">
          {phase === 'checking_resume' && <div className="bridge-state" role="status"><FiLoader className="spinner-animation" /><strong>Checking for an unfinished KICKO transfer</strong><span>TrimOut will resume only if the selected plays and local files still match.</span></div>}
          {phase === 'connect' && <div className="bridge-intro"><FiShield /><div><strong>Connect only when you are ready to continue in KICKO</strong><p>TrimOut first checks your selected plays on this computer. KICKO verifies an active paid subscription before any upload, cloud project or storage is created.</p></div><ul><li>{selectedCount} selected {selectedCount === 1 ? 'play' : 'plays'} will keep their current order and categories.</li><li>Your original game videos stay on this computer.</li><li>You can still close this window and use Download to computer.</li></ul></div>}
          {phase === 'connecting' && (code
            ? <div className="bridge-state" role="status"><FiLogIn /><strong>Approve the connection in your browser</strong><span className="bridge-code-label">Connection code</span><code>{code}</code><span>No files are uploaded until KICKO confirms an active paid subscription.</span></div>
            : <div className="bridge-state" role="status"><FiLoader className="spinner-animation" /><strong>{progressCopy.title}</strong><span>{progressCopy.detail}</span>{progress.fileName && <small>{progress.fileName}</small>}<progress aria-label="Local file check progress" max={progress.total || 1} value={progress.current} /></div>)}
          {phase === 'choose' && <><label className="bridge-project-select" htmlFor="kicko-destination"><span>Send selected plays to</span><select id="kicko-destination" value={destination} onChange={(event) => setDestination(event.target.value)}><option value="new">Create a new KICKO project</option>{projects.map((item) => <option key={item.id} value={item.id}>{getKickoProjectOptionLabel(item, clipsPerProject)}</option>)}</select></label><div className="bridge-transfer-summary"><strong>{selectedCount} selected {selectedCount === 1 ? 'play' : 'plays'}{destinationCapacity.remaining == null ? '' : ` · ${destinationCapacity.remaining} spots available`}</strong><span>Files upload one at a time and are validated before they enter KICKO. Their approved order and Scout categories are preserved.</span>{destinationCapacity.exceeded ? <small className="bridge-capacity-error">This destination does not have room for all selected plays. Return to Review and select {destinationCapacity.remaining} or fewer.</small> : <small>A new cloud project is created only after every selected play is ready.</small>}</div></>}
          {phase === 'transferring' && <div className="bridge-state" role="status"><FiUploadCloud /><strong>{progressCopy.title}</strong><span>{progressCopy.detail}</span>{progress.fileName && <small>{progress.fileName}</small>}<progress aria-label="KICKO transfer progress" max={progress.total || 1} value={progress.current} /><span>You can cancel safely. Your local TrimOut project will not change.</span></div>}
          {phase === 'cancelling' && <div className="bridge-state" role="status"><FiLoader className="spinner-animation" /><strong>Stopping the transfer safely</strong><span>KICKO is cancelling temporary upload work. Your local project stays untouched.</span></div>}
          {phase === 'subscription_required' && <div className="bridge-state subscription-required" role="status"><FiCreditCard /><strong>Active KICKO subscription required</strong><span>Your selected plays remain in TrimOut. No files were uploaded and no cloud project was created.</span><small>Founder Beta and documented admin accounts can continue through this connection.</small></div>}
          {phase === 'done' && <div className="bridge-state success" role="status"><FiCheck /><strong>Your KICKO project is ready</strong><span>The selected plays arrived in the approved order. Open KICKO to select the player and add tracking effects.</span></div>}
          {phase === 'error' && <div className="bridge-state error" role="alert"><FiAlertTriangle /><strong>{retryTarget === 'cancel' ? 'Rollback still needs confirmation' : 'Connection stopped'}</strong><span>{error}</span></div>}
        </div>
        <footer className="kicko-dialog-footer bridge-footer">
          {phase === 'connect' && <><button type="button" className="secondary-button" onClick={() => handleClose()}>Close</button><button type="button" className="primary-button" disabled={selectedCount === 0} onClick={() => handleConnect()}><FiLogIn /> Connect KICKO account</button></>}
          {['checking_resume', 'connecting'].includes(phase) && <button type="button" className="secondary-button" onClick={() => handleClose()}>Cancel</button>}
          {phase === 'choose' && <><button type="button" className="secondary-button" onClick={() => handleClose()}>Cancel</button><button type="button" className="primary-button" disabled={selectedCount === 0 || destinationCapacity.exceeded} onClick={() => handleUpload()}><FiUploadCloud /> Send selected plays</button></>}
          {phase === 'transferring' && <button type="button" className="secondary-button danger-button" onClick={() => handleClose()}><FiX /> Cancel transfer</button>}
          {phase === 'subscription_required' && <><button type="button" className="secondary-button" onClick={openPricing}><FiExternalLink /> View Founder Beta</button><button type="button" className="primary-button" onClick={() => handleFreshConnection()}><FiRefreshCw /> Try with active plan</button></>}
          {phase === 'done' && <><button type="button" className="secondary-button" onClick={() => handleClose()}>Close</button><button type="button" className="primary-button" onClick={openKicko}><FiExternalLink /> Open in KICKO</button></>}
          {phase === 'error' && <>{retryTarget !== 'cancel' && <button type="button" className="secondary-button" onClick={() => handleClose()}>Close</button>}<button type="button" className="primary-button" onClick={() => handleRetry()}><FiRefreshCw /> {retryTarget === 'cancel' ? 'Try cancelling again' : 'Try again'}</button></>}
        </footer>
      </section>
    </div>
  );
}
