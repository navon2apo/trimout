/* Function declarations keep the request pipeline readable from public API to transport. */
/* eslint-disable no-use-before-define */
import type { ProjectPlay, TrimoutProject } from './projectModel';
import { getOrderedSelectedPlays } from './projectModel';
import { SCOUT_CATALOG_VERSION, SCOUT_ROLE_BY_ID } from './scoutCatalog';
import { getOpeningCandidateIds } from './scoutLogic';

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

interface PreparedPlay {
  play: ProjectPlay;
  fileName: string;
  size: number;
  contentType: string;
}

export const KICKO_VIDEO_EXTENSIONS = ['avi', 'm4v', 'mkv', 'mov', 'mp4', 'webm', 'wmv'] as const;
const KICKO_VIDEO_EXTENSION_SET = new Set<string>(KICKO_VIDEO_EXTENSIONS);

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
  const openingCandidateIds = getOpeningCandidateIds(project);
  const preparedPlays = await preparePlays(selected);

  let projectId = destinationProjectId;
  let existingProject: KickoProjectRecord | null = null;
  if (projectId) {
    const existing = await bridgeRequest(connection, `/api/mvp/projects/${encodeURIComponent(projectId)}`);
    existingProject = (existing.project as KickoProjectRecord | undefined) || null;
    if (!existingProject) throw new Error('The selected KICKO project could not be loaded.');
  }

  const staged = [];
  for (const [index, prepared] of preparedPlays.entries()) {
    onProgress?.({ current: index, total: preparedPlays.length, fileName: prepared.fileName });
    try {
      staged.push({ play: prepared.play, staged: await uploadPlay(connection, prepared) });
      onProgress?.({ current: index + 1, total: preparedPlays.length, fileName: prepared.fileName });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Upload failed.';
      throw new Error(`Could not upload "${prepared.fileName}": ${reason}`);
    }
  }

  // Create a cloud project only after every local file passed preflight and upload.
  // This prevents failed transfers from leaving an empty project in KICKO.
  if (!projectId) {
    const created = await bridgeRequest(connection, '/api/mvp/projects/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildProjectIdentity(project)),
    });
    projectId = String(created.project?.id || '');
    if (!projectId) throw new Error('KICKO could not create the project.');
  }

  const existingClips = Array.isArray(existingProject?.['clips']) ? existingProject['clips'] : [];
  const positionOffset = existingClips.length;
  const importedClips = staged.map(({ play, staged: stagedClip }, index) => (
    buildDraftClip(play, stagedClip, positionOffset + index, openingCandidateIds.has(play.id))
  ));
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
      ...(project.scoutRole ? { scoutMode: { enabled: true, position: project.scoutRole, catalogVersion: SCOUT_CATALOG_VERSION } } : {}),
      source: 'kicko-trimout',
      trimoutProjectId: project.id,
      scoutCatalogVersion: SCOUT_CATALOG_VERSION,
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

async function preparePlays(plays: ProjectPlay[]): Promise<PreparedPlay[]> {
  const fs = window.require('fs/promises') as { stat: (path: string) => Promise<{ size: number; isFile: () => boolean }> };
  const path = window.require('path') as { basename: (value: string) => string };
  const prepared: PreparedPlay[] = [];
  for (const play of plays) {
    const fileName = path.basename(play.filePath || play.fileName);
    const uploadInfo = getKickoUploadInfo(fileName);
    let stats: { size: number; isFile: () => boolean };
    try {
      stats = await fs.stat(play.filePath);
    } catch {
      throw new Error(`Exported clip not found: "${fileName}". Export this game again before continuing to KICKO.`);
    }
    if (!stats.isFile() || stats.size <= 0) throw new Error(`Exported clip is empty: "${fileName}".`);
    prepared.push({ play, fileName, size: stats.size, contentType: uploadInfo.contentType });
  }
  return prepared;
}

async function uploadPlay(connection: KickoConnection, prepared: PreparedPlay): Promise<StagedClip> {
  const { play, fileName, size, contentType } = prepared;
  const fs = window.require('fs/promises') as {
    readFile: (path: string) => Promise<Uint8Array>;
  };
  const signed = await bridgeRequest(connection, '/api/mvp/direct-upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaType: 'clip', fileName, contentType, sizeBytes: size }),
  });
  const bytes = await fs.readFile(play.filePath);
  const uploadBody = Uint8Array.from(bytes).buffer;
  const uploadResponse = await fetch(String(signed.uploadUrl), { method: 'PUT', headers: signed.headers || { 'Content-Type': contentType }, body: uploadBody });
  if (!uploadResponse.ok) throw new Error(`File transfer failed (${uploadResponse.status}).`);
  const staged = await bridgeRequest(connection, '/api/mvp/stage-direct-clip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clipKey: signed.clipKey,
      r2Key: signed.r2Key,
      originalName: fileName,
      sizeBytes: size,
      mimeType: contentType,
      metadata: { duration: play.duration || 0, sizeBytes: size, mimeType: contentType },
    }),
  });
  return { clipKey: String(staged.clipKey), manifest: staged.manifest || {}, metadata: staged.metadata || {} };
}

function buildDraftClip(play: ProjectPlay, staged: StagedClip, position: number, isOpeningCandidate: boolean) {
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
        isOpeningCandidate,
        iqGuidanceVersion: SCOUT_CATALOG_VERSION,
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

export function getKickoUploadInfo(fileName: string): { extension: string; contentType: string } {
  const dotIndex = fileName.lastIndexOf('.');
  const extension = dotIndex > 0 && dotIndex < fileName.length - 1 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
  if (!extension || !KICKO_VIDEO_EXTENSION_SET.has(extension)) {
    const format = extension ? `.${extension}` : 'without a file extension';
    throw new Error(`KICKO cannot upload clips ${format}. Export this clip as MP4 and try again.`);
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
