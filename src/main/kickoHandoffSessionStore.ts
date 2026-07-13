const SESSION_VERSION = 1 as const;
const MAX_SAVED_SESSIONS = 20;
const MAX_FUTURE_SESSION_MS = 24 * 60 * 60 * 1000;
const PROJECT_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;
const HANDOFF_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEVICE_SECRET_RE = /^[A-Za-z0-9_-]{32,128}$/;
const USER_CODE_RE = /^[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const SHA256_RE = /^[a-f0-9]{64}$/;

export interface KickoHandoffSession {
  projectId: string;
  handoffId: string;
  baseUrl: string;
  expiresAt: string;
  snapshotHash: string;
  userCode: string;
  verificationUrl: string;
  deviceSecret: string;
}

interface StoredKickoHandoffSession extends Omit<KickoHandoffSession, 'deviceSecret'> {
  version: typeof SESSION_VERSION;
  savedAt: string;
  secretCiphertext: string;
}

interface SessionBackend {
  read: () => unknown;
  write: (sessions: Record<string, StoredKickoHandoffSession>) => void;
}

interface SessionEncryption {
  isAvailable: () => boolean;
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
}

function normalizeWebUrl(value: unknown, fieldName: string) {
  const url = new URL(String(value || ''));
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) throw new TypeError(`${fieldName} must use HTTPS.`);
  if (url.username || url.password) throw new TypeError(`${fieldName} is invalid.`);
  return url.toString().replace(/\/+$/, '');
}

function normalizeSession(input: KickoHandoffSession, now: number): KickoHandoffSession {
  const projectId = String(input?.projectId || '').trim();
  const handoffId = String(input?.handoffId || '').trim().toLowerCase();
  const snapshotHash = String(input?.snapshotHash || '').trim().toLowerCase();
  const userCode = String(input?.userCode || '').trim().toUpperCase();
  const deviceSecret = String(input?.deviceSecret || '').trim();
  const expiresAtMs = new Date(input?.expiresAt).getTime();
  if (!PROJECT_ID_RE.test(projectId)) throw new TypeError('The local KICKO project id is invalid.');
  if (!HANDOFF_ID_RE.test(handoffId)) throw new TypeError('The KICKO handoff id is invalid.');
  if (!SHA256_RE.test(snapshotHash)) throw new TypeError('The KICKO snapshot hash is invalid.');
  if (!USER_CODE_RE.test(userCode)) throw new TypeError('The KICKO connection code is invalid.');
  if (!DEVICE_SECRET_RE.test(deviceSecret)) throw new TypeError('The KICKO device secret is invalid.');
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= now || expiresAtMs > now + MAX_FUTURE_SESSION_MS) {
    throw new TypeError('The KICKO handoff expiry is invalid.');
  }
  return {
    projectId,
    handoffId,
    baseUrl: normalizeWebUrl(input.baseUrl, 'KICKO server address'),
    expiresAt: new Date(expiresAtMs).toISOString(),
    snapshotHash,
    userCode,
    verificationUrl: normalizeWebUrl(input.verificationUrl, 'KICKO connection page'),
    deviceSecret,
  };
}

function readStoredSessions(backend: SessionBackend) {
  const value = backend.read();
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, StoredKickoHandoffSession>;
}

function pruneStoredSessions(sessions: Record<string, StoredKickoHandoffSession>, now: number) {
  return Object.fromEntries(Object.entries(sessions).filter(([projectId, session]) => (
    PROJECT_ID_RE.test(projectId)
    && session?.version === SESSION_VERSION
    && Number.isFinite(new Date(session.expiresAt).getTime())
    && new Date(session.expiresAt).getTime() > now
  )));
}

export function createKickoHandoffSessionStore({ backend, encryption, now = () => Date.now() }: {
  backend: SessionBackend;
  encryption: SessionEncryption;
  now?: () => number;
}) {
  function deleteSession(projectId: string) {
    if (!PROJECT_ID_RE.test(projectId)) return false;
    const sessions = pruneStoredSessions(readStoredSessions(backend), now());
    const existed = Object.hasOwn(sessions, projectId);
    backend.write(Object.fromEntries(Object.entries(sessions).filter(([key]) => key !== projectId)));
    return existed;
  }

  function saveSession(input: KickoHandoffSession) {
    const normalized = normalizeSession(input, now());
    if (!encryption.isAvailable()) {
      deleteSession(normalized.projectId);
      return { saved: false as const, reason: 'secure_storage_unavailable' as const };
    }
    const secretCiphertext = encryption.encrypt(normalized.deviceSecret);
    if (!secretCiphertext || secretCiphertext === normalized.deviceSecret) throw new Error('Secure storage did not encrypt the KICKO secret.');
    const sessions = pruneStoredSessions(readStoredSessions(backend), now());
    sessions[normalized.projectId] = {
      version: SESSION_VERSION,
      projectId: normalized.projectId,
      handoffId: normalized.handoffId,
      baseUrl: normalized.baseUrl,
      expiresAt: normalized.expiresAt,
      snapshotHash: normalized.snapshotHash,
      userCode: normalized.userCode,
      verificationUrl: normalized.verificationUrl,
      savedAt: new Date(now()).toISOString(),
      secretCiphertext,
    };
    const newest = Object.fromEntries(Object.entries(sessions)
      .toSorted(([, left], [, right]) => right.savedAt.localeCompare(left.savedAt))
      .slice(0, MAX_SAVED_SESSIONS));
    backend.write(newest);
    return { saved: true as const };
  }

  function loadSession(projectId: string): KickoHandoffSession | null {
    if (!PROJECT_ID_RE.test(projectId)) return null;
    const sessions = pruneStoredSessions(readStoredSessions(backend), now());
    const stored = sessions[projectId];
    backend.write(sessions);
    if (!stored || !encryption.isAvailable()) return null;
    try {
      return normalizeSession({
        projectId: stored.projectId,
        handoffId: stored.handoffId,
        baseUrl: stored.baseUrl,
        expiresAt: stored.expiresAt,
        snapshotHash: stored.snapshotHash,
        userCode: stored.userCode,
        verificationUrl: stored.verificationUrl,
        deviceSecret: encryption.decrypt(stored.secretCiphertext),
      }, now());
    } catch {
      backend.write(Object.fromEntries(Object.entries(sessions).filter(([key]) => key !== projectId)));
      return null;
    }
  }

  return { saveSession, loadSession, deleteSession };
}
