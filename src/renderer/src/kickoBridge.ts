import type { ProjectPlayRating, TrimoutProject } from './projectModel';
import { getOrderedSelectedPlays } from './projectModel';
import { SCOUT_CATALOG_VERSION } from './scoutCatalog';
import { getOpeningCandidateIds } from './scoutLogic';

export const DEFAULT_KICKO_BASE_URL = 'https://soccer-web-edit-production.up.railway.app';

const MAX_HANDOFF_CLIPS = 60;
const MAX_HANDOFF_BYTES = 2_147_483_648;
const MAX_CLIP_BYTES = 536_870_912;
const MAX_HANDOFF_DURATION_SECONDS = 300;
const MAX_CLIP_DURATION_SECONDS = 90;
const HANDOFF_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVICE_SECRET_RE = /^[A-Za-z0-9_-]{32,128}$/;
const USER_CODE_RE = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;

export interface KickoProjectSummary {
  id: string;
  title: string;
  projectType?: string;
  status?: string;
  clipCount?: number;
  updatedAt?: string;
}

interface FileInspection {
  fileName: string;
  sizeBytes: number;
  mtimeMs: number;
  sha256: string;
}

interface PreparedKickoPlay extends FileInspection {
  clientClipId: string;
  filePath: string;
  contentType: string;
  actionType: string;
  rating: ProjectPlayRating;
  order: number;
  durationSeconds: number;
  isOpeningCandidate: boolean;
}

export interface KickoConnection {
  projectId: string;
  handoffId: string;
  deviceSecret: string;
  baseUrl: string;
  expiresAt: string;
  userCode: string;
  verificationUrl: string;
  snapshotHash: string;
  selectionSignature: string;
  preparedPlays: PreparedKickoPlay[];
  state: string;
}

export interface KickoTransferProgress {
  phase: 'preparing' | 'uploading' | 'validating' | 'finalizing';
  current: number;
  total: number;
  fileName: string;
  operationId?: string;
}

interface KickoHandoffSessionRecord {
  projectId: string;
  handoffId: string;
  baseUrl: string;
  expiresAt: string;
  snapshotHash: string;
  userCode: string;
  verificationUrl: string;
  deviceSecret: string;
}

export class KickoBridgeError extends Error {
  code: string;

  status: number | null;

  constructor(message: string, { code = 'kicko_handoff_failed', status = null }: { code?: string; status?: number | null } = {}) {
    super(message);
    this.name = 'KickoBridgeError';
    this.code = code;
    this.status = status;
  }
}

export interface KickoBridgeDependencies {
  requestJson: (url: string, init?: RequestInit) => Promise<Record<string, unknown>>;
  inspectFile: (filePath: string) => Promise<FileInspection>;
  uploadFile: (input: {
    operationId: string;
    filePath: string;
    uploadUrl: string;
    headers?: Record<string, string>;
    expectedSizeBytes: number;
    expectedMtimeMs: number;
  }) => Promise<{ status: number }>;
  cancelUpload: (operationId: string) => Promise<boolean>;
  openExternal: (url: string) => Promise<void>;
  sleep: (milliseconds: number) => Promise<void>;
  now: () => number;
  randomId: () => string;
  getAppVersion: () => string;
  digestText: (value: string) => Promise<string>;
  saveSession: (session: KickoHandoffSessionRecord) => Promise<{ saved: boolean; reason?: string }>;
  loadSession: (projectId: string) => Promise<KickoHandoffSessionRecord | null>;
  deleteSession: (projectId: string) => Promise<boolean>;
}

function asObject(value: unknown): Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function defaultRequestJson(url: string, init: RequestInit = {}) {
  return fetch(url, { ...init, cache: 'no-store' }).then(async (response) => {
    const data = asObject(await response.json().catch(() => ({})));
    const error = asObject(data['error']);
    if (!response.ok || data.ok === false) {
      throw new KickoBridgeError(
        String(error['message'] || error['userMessage'] || `KICKO request failed (${response.status}).`),
        { code: String(error['code'] || 'kicko_request_failed'), status: response.status },
      );
    }
    return data;
  });
}

async function defaultDigestText(value: string) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getDependencies(overrides: Partial<KickoBridgeDependencies> = {}): KickoBridgeDependencies {
  return {
    requestJson: defaultRequestJson,
    inspectFile: (filePath) => window.electron.inspectKickoFile(filePath),
    uploadFile: (input) => window.electron.uploadKickoFile(input),
    cancelUpload: (operationId) => window.electron.cancelKickoFileUpload(operationId),
    openExternal: async (url) => { await window.require('electron').shell.openExternal(url); },
    sleep: (milliseconds) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
    now: () => Date.now(),
    randomId: () => globalThis.crypto.randomUUID(),
    getAppVersion: () => window.require('@electron/remote').app.getVersion(),
    digestText: defaultDigestText,
    saveSession: (session) => window.electron.saveKickoHandoffSession(session),
    loadSession: (projectId) => window.electron.loadKickoHandoffSession(projectId),
    deleteSession: (projectId) => window.electron.deleteKickoHandoffSession(projectId),
    ...overrides,
  };
}

function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new KickoBridgeError('The KICKO server address must use HTTPS.', { code: 'invalid_server_url' });
  }
  if (url.username || url.password) throw new KickoBridgeError('The KICKO server address is invalid.', { code: 'invalid_server_url' });
  return url.toString().replace(/\/+$/, '');
}

function normalizeVerificationUrl(value: unknown, baseUrl: string) {
  const url = new URL(String(value || ''));
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new KickoBridgeError('KICKO returned an invalid connection page.', { code: 'invalid_verification_url' });
  }
  if (url.username || url.password || url.origin !== new URL(baseUrl).origin) {
    throw new KickoBridgeError('KICKO returned an invalid connection page.', { code: 'invalid_verification_url' });
  }
  return url.toString();
}

function buildSelectionSignature(project: TrimoutProject) {
  return JSON.stringify({
    projectId: project.id,
    name: project.name,
    playerName: project.playerName,
    scoutRole: project.scoutRole,
    plays: getOrderedSelectedPlays(project).map((play, order) => ({
      id: play.id,
      filePath: play.filePath,
      actionType: play.actionType,
      rating: play.rating,
      duration: play.duration,
      order,
    })),
  });
}

export const KICKO_VIDEO_EXTENSIONS = ['avi', 'm4v', 'mkv', 'mov', 'mp4', 'webm', 'wmv'] as const;
const KICKO_VIDEO_EXTENSION_SET = new Set<string>(KICKO_VIDEO_EXTENSIONS);

export function getKickoUploadInfo(fileName: string): { extension: string; contentType: string } {
  const dotIndex = fileName.lastIndexOf('.');
  const extension = dotIndex > 0 && dotIndex < fileName.length - 1 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
  if (!extension || !KICKO_VIDEO_EXTENSION_SET.has(extension)) {
    const format = extension ? `.${extension}` : 'without a file extension';
    throw new KickoBridgeError(`KICKO cannot upload clips ${format}. Export this clip as MP4 and try again.`, { code: 'unsupported_video_type' });
  }
  const contentTypes: Record<string, string> = {
    avi: 'video/x-msvideo',
    m4v: 'video/x-m4v',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    mp4: 'video/mp4',
    webm: 'video/webm',
    wmv: 'video/x-ms-wmv',
  };
  return { extension, contentType: contentTypes[extension]! };
}

async function prepareKickoHandoff(project: TrimoutProject, deps: KickoBridgeDependencies, onProgress?: (value: KickoTransferProgress) => void) {
  const selected = getOrderedSelectedPlays(project);
  if (selected.length === 0) throw new KickoBridgeError('Select at least one play before connecting to KICKO.', { code: 'no_selected_plays' });
  if (selected.length > MAX_HANDOFF_CLIPS) {
    throw new KickoBridgeError(`KICKO accepts up to ${MAX_HANDOFF_CLIPS} selected plays per transfer.`, { code: 'too_many_clips' });
  }

  const openingCandidates = getOpeningCandidateIds(project);
  const preparedPlays: PreparedKickoPlay[] = [];
  for (const [order, play] of selected.entries()) {
    const durationSeconds = Number(play.duration);
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > MAX_CLIP_DURATION_SECONDS) {
      throw new KickoBridgeError(`"${play.fileName}" must be between 0 and ${MAX_CLIP_DURATION_SECONDS} seconds for KICKO.`, { code: 'invalid_clip_duration' });
    }
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(play.id)) {
      throw new KickoBridgeError('This project contains an invalid local clip identifier.', { code: 'invalid_clip_id' });
    }
    onProgress?.({ phase: 'preparing', current: order, total: selected.length, fileName: play.fileName });
    let inspection: FileInspection;
    try {
      inspection = await deps.inspectFile(play.filePath);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'The exported clip is unavailable.';
      throw new KickoBridgeError(`Could not check "${play.fileName}": ${reason}`, { code: 'clip_preflight_failed' });
    }
    const uploadInfo = getKickoUploadInfo(inspection.fileName);
    if (inspection.sizeBytes > MAX_CLIP_BYTES) {
      throw new KickoBridgeError(`"${inspection.fileName}" is larger than KICKO's 512 MB clip limit.`, { code: 'clip_too_large' });
    }
    preparedPlays.push({
      ...inspection,
      clientClipId: play.id,
      filePath: play.filePath,
      contentType: uploadInfo.contentType,
      actionType: play.actionType,
      rating: play.rating,
      order,
      durationSeconds,
      isOpeningCandidate: openingCandidates.has(play.id),
    });
    onProgress?.({ phase: 'preparing', current: order + 1, total: selected.length, fileName: play.fileName });
  }

  const totalSizeBytes = preparedPlays.reduce((total, play) => total + play.sizeBytes, 0);
  const selectedDurationSeconds = preparedPlays.reduce((total, play) => total + play.durationSeconds, 0);
  if (!Number.isSafeInteger(totalSizeBytes) || totalSizeBytes > MAX_HANDOFF_BYTES) {
    throw new KickoBridgeError('The selected clips exceed KICKO\'s 2 GB transfer limit.', { code: 'handoff_too_large' });
  }
  if (selectedDurationSeconds > MAX_HANDOFF_DURATION_SECONDS) {
    throw new KickoBridgeError('The selected plays exceed KICKO\'s 5 minute project limit.', { code: 'handoff_too_long' });
  }

  const snapshotHash = await deps.digestText(JSON.stringify({
    projectId: project.id,
    name: project.name,
    playerName: project.playerName,
    scoutRole: project.scoutRole,
    scoutCatalogVersion: SCOUT_CATALOG_VERSION,
    clips: preparedPlays.map((play) => ({
      clientClipId: play.clientClipId,
      fileName: play.fileName,
      sizeBytes: play.sizeBytes,
      sha256: play.sha256,
      actionType: play.actionType,
      rating: play.rating,
      order: play.order,
      durationSeconds: play.durationSeconds,
      isOpeningCandidate: play.isOpeningCandidate,
    })),
  }));

  return {
    preparedPlays,
    snapshotHash,
    selectionSignature: buildSelectionSignature(project),
    totalSizeBytes,
    selectedDurationSeconds,
  };
}

function deviceHeaders(connection: KickoConnection, headers: HeadersInit = {}) {
  return { ...headers, Authorization: `TrimOut ${connection.deviceSecret}` };
}

function resumableSession(connection: KickoConnection): KickoHandoffSessionRecord {
  return {
    projectId: connection.projectId,
    handoffId: connection.handoffId,
    baseUrl: connection.baseUrl,
    expiresAt: connection.expiresAt,
    snapshotHash: connection.snapshotHash,
    userCode: connection.userCode,
    verificationUrl: connection.verificationUrl,
    deviceSecret: connection.deviceSecret,
  };
}

const TERMINAL_HANDOFF_STATES = new Set(['cancelled', 'failed', 'rolled_back', 'expired']);
const WAITING_HANDOFF_STATES = new Set([
  'created',
  'awaiting_auth',
  'validating',
  'finalizing',
  'rolling_back',
]);

async function waitForKickoReadiness(
  connection: KickoConnection,
  deps: KickoBridgeDependencies,
  { openApprovalPage = false }: { openApprovalPage?: boolean } = {},
): Promise<KickoConnection | null> {
  const expiryTime = new Date(connection.expiresAt).getTime();
  let approvalPageOpened = false;
  while (deps.now() < expiryTime) {
    const status = await deps.requestJson(`${connection.baseUrl}/api/trimout/handoffs/status`, {
      headers: deviceHeaders(connection),
    });
    const state = String(status.status || '');
    if (['ready_for_upload', 'uploading', 'completed'].includes(state)) return { ...connection, state };
    if (state === 'subscription_required' || ['awaiting_subscription', 'awaiting_payment_confirmation'].includes(state)) {
      throw new KickoBridgeError('An active paid KICKO subscription is required. No files were uploaded.', { code: 'subscription_required', status: 402 });
    }
    if (state === 'temporarily_unavailable') {
      throw new KickoBridgeError('KICKO could not verify the subscription right now. No files were uploaded.', { code: 'entitlement_unavailable', status: 503 });
    }
    if (TERMINAL_HANDOFF_STATES.has(state)) {
      await deps.deleteSession(connection.projectId);
      return null;
    }
    if (!WAITING_HANDOFF_STATES.has(state)) {
      throw new KickoBridgeError('KICKO returned an unknown connection state.', { code: 'invalid_handoff_state' });
    }
    if (openApprovalPage && !approvalPageOpened && ['created', 'awaiting_auth'].includes(state)) {
      approvalPageOpened = true;
      await deps.openExternal(connection.verificationUrl);
    }
    await deps.sleep(1500);
  }
  await deps.deleteSession(connection.projectId);
  throw new KickoBridgeError('The KICKO connection code expired. No files were uploaded.', { code: 'handoff_expired', status: 410 });
}

export async function connectToKicko({
  project,
  baseUrl = DEFAULT_KICKO_BASE_URL,
  onCode,
  onProgress,
  dependencies,
}: {
  project: TrimoutProject;
  baseUrl?: string;
  onCode?: (value: { userCode: string; verificationUrl: string; expiresAt: string }) => void;
  onProgress?: (value: KickoTransferProgress) => void;
  dependencies?: Partial<KickoBridgeDependencies>;
}): Promise<KickoConnection> {
  const deps = getDependencies(dependencies);
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const prepared = await prepareKickoHandoff(project, deps, onProgress);
  const started = await deps.requestJson(`${normalizedBaseUrl}/api/trimout/handoffs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientProjectId: project.id,
      snapshotHash: prepared.snapshotHash,
      sourceAppVersion: deps.getAppVersion(),
      scoutPosition: project.scoutRole,
      expectedClipCount: prepared.preparedPlays.length,
      expectedTotalSizeBytes: prepared.totalSizeBytes,
      selectedDurationSeconds: prepared.selectedDurationSeconds,
    }),
  });
  const handoffId = String(started.handoffId || '');
  const deviceSecret = String(started.deviceSecret || '');
  const userCode = String(started.userCode || '');
  const expiresAt = String(started.expiresAt || '');
  const verificationUrl = normalizeVerificationUrl(started.verificationUrl, normalizedBaseUrl);
  const expiryTime = new Date(expiresAt).getTime();
  if (!HANDOFF_ID_RE.test(handoffId) || !DEVICE_SECRET_RE.test(deviceSecret) || !USER_CODE_RE.test(userCode)
    || !Number.isFinite(expiryTime) || expiryTime <= deps.now()) {
    throw new KickoBridgeError('KICKO did not return a valid connection code.', { code: 'invalid_handoff_response' });
  }

  const connection: KickoConnection = {
    projectId: project.id,
    handoffId,
    deviceSecret,
    baseUrl: normalizedBaseUrl,
    expiresAt,
    userCode,
    verificationUrl,
    snapshotHash: prepared.snapshotHash,
    selectionSignature: prepared.selectionSignature,
    preparedPlays: prepared.preparedPlays,
    state: 'awaiting_auth',
  };
  await deps.saveSession(resumableSession(connection));
  onCode?.({ userCode, verificationUrl, expiresAt });
  const ready = await waitForKickoReadiness(connection, deps, { openApprovalPage: true });
  if (!ready) throw new KickoBridgeError('The KICKO connection stopped before upload.', { code: 'handoff_stopped' });
  return ready;
}

export async function resumeKickoHandoff({ project, onCode, onProgress, dependencies }: {
  project: TrimoutProject;
  onCode?: (value: { userCode: string; verificationUrl: string; expiresAt: string }) => void;
  onProgress?: (value: KickoTransferProgress) => void;
  dependencies?: Partial<KickoBridgeDependencies>;
}): Promise<KickoConnection | null> {
  const deps = getDependencies(dependencies);
  const saved = await deps.loadSession(project.id);
  if (!saved) return null;
  const prepared = await prepareKickoHandoff(project, deps, onProgress);
  if (prepared.snapshotHash !== saved.snapshotHash) {
    await deps.deleteSession(project.id);
    return null;
  }
  const baseUrl = normalizeBaseUrl(saved.baseUrl);
  const verificationUrl = normalizeVerificationUrl(saved.verificationUrl, baseUrl);
  const expiryTime = new Date(saved.expiresAt).getTime();
  if (!HANDOFF_ID_RE.test(saved.handoffId) || !DEVICE_SECRET_RE.test(saved.deviceSecret)
    || !USER_CODE_RE.test(saved.userCode) || !Number.isFinite(expiryTime) || expiryTime <= deps.now()) {
    await deps.deleteSession(project.id);
    return null;
  }
  const connection: KickoConnection = {
    projectId: project.id,
    handoffId: saved.handoffId,
    deviceSecret: saved.deviceSecret,
    baseUrl,
    expiresAt: saved.expiresAt,
    userCode: saved.userCode,
    verificationUrl,
    snapshotHash: prepared.snapshotHash,
    selectionSignature: prepared.selectionSignature,
    preparedPlays: prepared.preparedPlays,
    state: 'awaiting_auth',
  };
  onCode?.({ userCode: connection.userCode, verificationUrl, expiresAt: connection.expiresAt });
  return waitForKickoReadiness(connection, deps, { openApprovalPage: true });
}

export async function listKickoProjects(connection: KickoConnection, dependencies?: Partial<KickoBridgeDependencies>): Promise<KickoProjectSummary[]> {
  const deps = getDependencies(dependencies);
  const response = await deps.requestJson(`${connection.baseUrl}/api/trimout/handoffs/projects`, {
    headers: deviceHeaders(connection),
  });
  return Array.isArray(response.projects) ? response.projects.map((value) => {
    const project = asObject(value);
    return {
      id: String(project['id'] || ''),
      title: String(project['title'] || 'Untitled project'),
      status: project['status'] == null ? undefined : String(project['status']),
      projectType: project['projectType'] == null ? undefined : String(project['projectType']),
      clipCount: Number.isFinite(Number(project['clipCount'])) ? Number(project['clipCount']) : undefined,
      updatedAt: project['updatedAt'] == null ? undefined : String(project['updatedAt']),
    };
  }).filter((project) => project.id) : [];
}

export async function sendProjectToKicko({ connection, project, destinationProjectId, onProgress, dependencies }: {
  connection: KickoConnection;
  project: TrimoutProject;
  destinationProjectId: string | null;
  onProgress?: (value: KickoTransferProgress) => void;
  dependencies?: Partial<KickoBridgeDependencies>;
}): Promise<{ projectId: string; openUrl: string }> {
  const deps = getDependencies(dependencies);
  if (buildSelectionSignature(project) !== connection.selectionSignature) {
    throw new KickoBridgeError('The selected plays changed after connection. Connect again before uploading.', { code: 'selection_changed' });
  }

  if (connection.state !== 'completed') {
    for (const prepared of connection.preparedPlays) {
      const grant = await deps.requestJson(`${connection.baseUrl}/api/trimout/handoffs/grants`, {
        method: 'POST',
        headers: deviceHeaders(connection, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          clientClipId: prepared.clientClipId,
          originalName: prepared.fileName,
          contentType: prepared.contentType,
          sizeBytes: prepared.sizeBytes,
          sha256: prepared.sha256,
          clip: {
            actionType: prepared.actionType,
            rating: prepared.rating,
            order: prepared.order,
            durationSeconds: prepared.durationSeconds,
            isOpeningCandidate: prepared.isOpeningCandidate,
          },
        }),
      });
      const grantId = String(grant.grantId || '');
      let grantStatus = String(grant.status || '');
      if (!grantId) throw new KickoBridgeError('KICKO did not return an upload grant.', { code: 'invalid_grant_response' });

      if (grant.uploadRequired === true) {
        const uploadUrl = String(grant.uploadUrl || '');
        if (!uploadUrl) throw new KickoBridgeError('KICKO did not return an upload address.', { code: 'invalid_grant_response' });
        const operationId = deps.randomId();
        onProgress?.({ phase: 'uploading', current: prepared.order, total: connection.preparedPlays.length, fileName: prepared.fileName, operationId });
        await deps.uploadFile({
          operationId,
          filePath: prepared.filePath,
          uploadUrl,
          headers: grant.headers as Record<string, string> | undefined,
          expectedSizeBytes: prepared.sizeBytes,
          expectedMtimeMs: prepared.mtimeMs,
        });
        grantStatus = 'uploaded';
      }

      if (!['validated', 'consumed'].includes(grantStatus)) {
        onProgress?.({ phase: 'validating', current: prepared.order, total: connection.preparedPlays.length, fileName: prepared.fileName });
        const completed = await deps.requestJson(`${connection.baseUrl}/api/trimout/handoffs/grants/${encodeURIComponent(grantId)}/complete`, {
          method: 'POST',
          headers: deviceHeaders(connection, { 'Content-Type': 'application/json' }),
          body: '{}',
        });
        grantStatus = String(completed.status || '');
      }
      if (!['validated', 'consumed'].includes(grantStatus)) {
        throw new KickoBridgeError(`KICKO could not validate "${prepared.fileName}".`, { code: 'upload_not_validated' });
      }
      onProgress?.({ phase: 'validating', current: prepared.order + 1, total: connection.preparedPlays.length, fileName: prepared.fileName });
    }
  }

  onProgress?.({ phase: 'finalizing', current: connection.preparedPlays.length, total: connection.preparedPlays.length, fileName: '' });
  const finalized = await deps.requestJson(`${connection.baseUrl}/api/trimout/handoffs/finalize`, {
    method: 'POST',
    headers: deviceHeaders(connection, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ destinationProjectId, title: project.name }),
  });
  const projectId = String(finalized.projectId || '');
  if (!projectId || String(finalized.status || '') !== 'completed') {
    throw new KickoBridgeError('KICKO could not finalize the project.', { code: 'finalize_failed' });
  }
  await deps.deleteSession(project.id).catch(() => false);
  return { projectId, openUrl: `${connection.baseUrl}/mvp/?projectId=${encodeURIComponent(projectId)}` };
}

export async function rollbackKickoHandoff(connection: KickoConnection, dependencies?: Partial<KickoBridgeDependencies>) {
  const deps = getDependencies(dependencies);
  const result = await deps.requestJson(`${connection.baseUrl}/api/trimout/handoffs/rollback`, {
    method: 'POST',
    headers: deviceHeaders(connection, { 'Content-Type': 'application/json' }),
    body: '{}',
  });
  await deps.deleteSession(connection.projectId).catch(() => false);
  return result;
}

export async function cancelKickoTransfer(connection: KickoConnection, operationId: string | null, dependencies?: Partial<KickoBridgeDependencies>) {
  const deps = getDependencies(dependencies);
  if (operationId) await deps.cancelUpload(operationId).catch(() => false);
  return rollbackKickoHandoff(connection, deps);
}
