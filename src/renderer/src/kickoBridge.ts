/* Function declarations keep the request pipeline readable from public API to transport. */
/* eslint-disable no-use-before-define */
import type { ProjectPlay, TrimoutProject } from './projectModel';
import { getOrderedSelectedPlays } from './projectModel';
import { SCOUT_ROLE_BY_ID } from './scoutCatalog';

export const DEFAULT_KICKO_BASE_URL = 'https://soccer-web-edit-production.up.railway.app';

export interface KickoProjectSummary {
  id: string;
  title: string;
  projectType?: string;
  status?: string;
}

export interface KickoConnection {
  bridgeToken: string;
  baseUrl: string;
}

interface KickoClipManifest extends Record<string, unknown> {
  source?: { sha256?: string; r2Key?: string };
  mediaLibrary?: { mediaItemId?: string };
}

interface KickoProjectRecord extends Record<string, unknown> {
  title?: string;
  player_data?: Record<string, unknown>;
  playerData?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  clips?: unknown[];
}

interface StagedClip {
  clipKey: string;
  manifest: KickoClipManifest;
  metadata: Record<string, unknown>;
}

export async function connectToKicko({ baseUrl = DEFAULT_KICKO_BASE_URL, onCode }: {
  baseUrl?: string;
  onCode?: (value: { userCode: string; verificationUrl: string }) => void;
} = {}): Promise<KickoConnection> {
  const start = await requestJson(`${baseUrl}/api/trimout/device/start`, { method: 'POST' });
  const deviceCode = String(start.deviceCode || '');
  const verificationUrl = String(start.verificationUrl || '');
  const userCode = String(start.userCode || '');
  if (!deviceCode || !verificationUrl) throw new Error('KICKO did not return a connection code.');
  onCode?.({ userCode, verificationUrl });
  await window.require('electron').shell.openExternal(verificationUrl);

  const expiresAt = Date.now() + (Number(start.expiresInSeconds) || 600) * 1000;
  while (Date.now() < expiresAt) {
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    const response = await fetch(`${baseUrl}/api/trimout/device/status?deviceCode=${encodeURIComponent(deviceCode)}`, { cache: 'no-store' });
    const status = await response.json().catch(() => ({}));
    if (response.status === 410 || status.status === 'expired') throw new Error('The KICKO connection code expired. Try again.');
    if (!response.ok) throw new Error(status?.error?.message || 'Could not check the KICKO connection.');
    if (status.status === 'approved' && status.bridgeToken) return { baseUrl, bridgeToken: String(status.bridgeToken) };
  }
  throw new Error('The KICKO connection code expired. Try again.');
}

export async function listKickoProjects(connection: KickoConnection): Promise<KickoProjectSummary[]> {
  const response = await bridgeRequest(connection, '/api/mvp/projects?limit=60');
  return Array.isArray(response.projects) ? response.projects : [];
}

export async function sendProjectToKicko({ connection, project, destinationProjectId, onProgress }: {
  connection: KickoConnection;
  project: TrimoutProject;
  destinationProjectId: string | null;
  onProgress?: (value: { current: number; total: number; fileName: string }) => void;
}): Promise<{ projectId: string; openUrl: string }> {
  const selected = getOrderedSelectedPlays(project);
  if (selected.length === 0) throw new Error('Select at least one play before sending.');

  let projectId = destinationProjectId;
  let existingProject: KickoProjectRecord | null = null;
  if (projectId) {
    const existing = await bridgeRequest(connection, `/api/mvp/projects/${encodeURIComponent(projectId)}`);
    existingProject = (existing.project as KickoProjectRecord | undefined) || null;
    if (!existingProject) throw new Error('The selected KICKO project could not be loaded.');
  } else {
    const created = await bridgeRequest(connection, '/api/mvp/projects/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildProjectIdentity(project)),
    });
    projectId = String(created.project?.id || '');
    if (!projectId) throw new Error('KICKO could not create the project.');
  }

  const staged = [];
  for (const [index, play] of selected.entries()) {
    onProgress?.({ current: index + 1, total: selected.length, fileName: play.fileName });
    staged.push({ play, staged: await uploadPlay(connection, play) });
  }

  const existingClips = Array.isArray(existingProject?.['clips']) ? existingProject['clips'] : [];
  const positionOffset = existingClips.length;
  const importedClips = staged.map(({ play, staged: stagedClip }, index) => buildDraftClip(play, stagedClip, positionOffset + index));
  await bridgeRequest(connection, `/api/mvp/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildProjectSavePayload(project, existingProject, importedClips)),
  });

  return { projectId, openUrl: `${connection.baseUrl}/mvp/?projectId=${encodeURIComponent(projectId)}` };
}

export function buildProjectIdentity(project: TrimoutProject) {
  const role = project.scoutRole ? SCOUT_ROLE_BY_ID.get(project.scoutRole) : null;
  return {
    title: project.name,
    playerData: {
      name: project.playerName,
      ...(role ? { position: role.label } : {}),
    },
    settings: {
      appMode: 'professional',
      ...(project.scoutRole ? { scoutMode: { enabled: true, position: project.scoutRole } } : {}),
      source: 'kicko-trimout',
      trimoutProjectId: project.id,
    },
  };
}

export function buildProjectSavePayload(
  project: TrimoutProject,
  existingProject: KickoProjectRecord | null,
  importedClips: unknown[],
) {
  const identity = buildProjectIdentity(project);
  const existingClips = Array.isArray(existingProject?.['clips']) ? existingProject['clips'] : [];
  return {
    title: existingProject?.['title'] || identity.title,
    playerData: {
      ...identity.playerData,
      ...existingProject?.['player_data'] || existingProject?.['playerData'],
    },
    settings: { ...identity.settings, ...existingProject?.['settings'] },
    clips: [...existingClips, ...importedClips],
  };
}

async function uploadPlay(connection: KickoConnection, play: ProjectPlay): Promise<StagedClip> {
  const fs = window.require('fs/promises') as {
    readFile: (path: string) => Promise<Uint8Array>;
    stat: (path: string) => Promise<{size: number}>;
  };
  const { size } = await fs.stat(play.filePath);
  const contentType = mimeForFile(play.fileName);
  const signed = await bridgeRequest(connection, '/api/mvp/direct-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaType: 'clip', fileName: play.fileName, contentType, sizeBytes: size }),
  });
  const bytes = await fs.readFile(play.filePath);
  const uploadBody = Uint8Array.from(bytes).buffer;
  const uploadResponse = await fetch(String(signed.uploadUrl), { method: 'PUT', headers: signed.headers || { 'Content-Type': contentType }, body: uploadBody });
  if (!uploadResponse.ok) throw new Error(`Upload failed for ${play.fileName}.`);
  const staged = await bridgeRequest(connection, '/api/mvp/stage-direct-clip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clipKey: signed.clipKey,
      r2Key: signed.r2Key,
      originalName: play.fileName,
      sizeBytes: size,
      mimeType: contentType,
      metadata: { duration: play.duration || 0, sizeBytes: size, mimeType: contentType },
    }),
  });
  return { clipKey: String(staged.clipKey), manifest: staged.manifest || {}, metadata: staged.metadata || {} };
}

function buildDraftClip(play: ProjectPlay, staged: StagedClip, position: number) {
  const { manifest } = staged;
  const source = manifest.source || {};
  return {
    clipKey: staged.clipKey,
    mediaItemId: manifest.mediaLibrary?.mediaItemId || null,
    position,
    status: 'uploaded',
    sourceHash: source.sha256 || null,
    sourceKey: source.r2Key || null,
    segmentKey: null,
    trackingKey: null,
    processedKey: null,
    manifest,
    settings: {
      editorState: {
        name: play.actionLabel,
        duration: play.duration || Number(staged.metadata['duration']) || 0,
        sizeBytes: Number(staged.metadata['sizeBytes']) || 0,
        mimeType: String(staged.metadata['mimeType'] || 'video/mp4'),
        status: 'staged',
      },
      scoutMeta: {
        actionType: play.actionType,
        actionTypeSource: 'trimout',
        rating: play.rating,
        saveToSeasonHighlight: true,
        isOpeningCandidate: play.rating === 'must_include' || play.rating === 'strong',
      },
    },
  };
}

async function bridgeRequest(connection: KickoConnection, path: string, init: RequestInit = {}) {
  return requestJson(`${connection.baseUrl}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bridge ${connection.bridgeToken}` },
  });
}

async function requestJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data?.error?.message || data?.error?.userMessage || `Request failed (${response.status}).`);
  return data;
}

function mimeForFile(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (extension === 'mov') return 'video/quicktime';
  if (extension === 'mkv') return 'video/x-matroska';
  if (extension === 'avi') return 'video/x-msvideo';
  return 'video/mp4';
}
