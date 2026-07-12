/**
 * TrimOut License System
 * - Stable machine fingerprint (generated once, stored in userData)
 * - Local encrypted store (electron-store)
 * - Online validation via Vercel serverless API
 * - 7-day offline grace period
 * - Auto-bypassed in dev mode (yarn dev) — no config needed
 * - Also bypassed via TRIMOUT_DEV_BYPASS=1 env var for manual override
 */

import { app } from 'electron';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import logger from './logger.js';
import isDev from './isDev.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Store = require('electron-store');

const licenseStore = new Store({
  name: 'license',
  encryptionKey: 'trimout-license-v1-xk9m2p',
});

// Bypass in dev mode (yarn dev) OR via explicit env var
const DEV_BYPASS = isDev || process.env['TRIMOUT_DEV_BYPASS'] === '1';
const LICENSE_SERVER = 'https://trimout-license.vercel.app';
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Machine fingerprint ────────────────────────────────────────────────────
// Stable per-machine UUID generated once and written to userData.
// Simple, reliable, survives reboots/reinstalls until userData is wiped.

function getMachineId(): string {
  const idFile = join(app.getPath('userData'), '.machine-id');
  if (existsSync(idFile)) {
    try {
      const id = readFileSync(idFile, 'utf8').trim();
      if (id.length > 8) return id;
    } catch {
      // fall through to generate
    }
  }
  const newId = createHash('sha256').update(randomUUID()).update(Date.now().toString()).digest('hex').slice(0, 32);
  try {
    writeFileSync(idFile, newId, { encoding: 'utf8', mode: 0o600 });
  } catch (err) {
    logger.warn('Could not persist machine ID', err);
  }
  return newId;
}

export function getMachineFingerprint(): string {
  return getMachineId();
}

// ─── Local storage helpers ──────────────────────────────────────────────────

interface LocalActivation {
  key: string;
  activatedAt: number;
  lastCheckedAt: number;
}

export function getLocalActivation(): LocalActivation | null {
  return (licenseStore.get('activation') as LocalActivation | undefined) ?? null;
}

function saveActivation(key: string) {
  const now = Date.now();
  licenseStore.set('activation', { key, activatedAt: now, lastCheckedAt: now } satisfies LocalActivation);
}

function touchLastChecked() {
  const existing = getLocalActivation();
  if (existing) {
    licenseStore.set('activation', { ...existing, lastCheckedAt: Date.now() } satisfies LocalActivation);
  }
}

function clearActivation() {
  licenseStore.delete('activation');
}

function isWithinGracePeriod(): boolean {
  const local = getLocalActivation();
  if (!local) return false;
  return Date.now() - local.lastCheckedAt < GRACE_PERIOD_MS;
}

// ─── Network helper ─────────────────────────────────────────────────────────

interface ApiResponse {
  ok: boolean;
  error?: string;
  [k: string]: unknown;
}

async function callServer(endpoint: string, body: Record<string, string>): Promise<ApiResponse> {
  const res = await fetch(`${LICENSE_SERVER}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Server returned ${res.status}: ${text}`);
  }
  return res.json() as Promise<ApiResponse>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function activateLicense(key: string): Promise<{ ok: boolean; error?: string }> {
  const cleanKey = key.trim().toUpperCase();
  if (!cleanKey) return { ok: false, error: 'Please enter a license key.' };

  if (DEV_BYPASS) {
    logger.info('[license] DEV_BYPASS active — skipping server check');
    saveActivation(cleanKey);
    return { ok: true };
  }

  const machineId = getMachineFingerprint();
  logger.info('[license] activating', { key: cleanKey, machineId });

  try {
    const result = await callServer('activate', { key: cleanKey, machineId });
    if (result.ok) saveActivation(cleanKey);
    return result;
  } catch (err) {
    logger.error('[license] activation network error', err);
    return { ok: false, error: 'Connection failed — check your internet and try again.' };
  }
}

export async function checkLicense(): Promise<{ ok: boolean; error?: string; gracePeriod?: boolean }> {
  if (DEV_BYPASS) return { ok: true };

  const local = getLocalActivation();
  if (!local) return { ok: false, error: 'No license activated on this machine.' };

  const machineId = getMachineFingerprint();

  try {
    const result = await callServer('status', { key: local.key, machineId });
    if (result.ok) touchLastChecked();
    return result;
  } catch (err) {
    logger.warn('[license] status check failed, using grace period', err);
    if (isWithinGracePeriod()) {
      logger.info('[license] within grace period — allowing offline use');
      return { ok: true, gracePeriod: true };
    }
    return {
      ok: false,
      error: `Cannot verify license and offline grace period has expired. Connect to the internet to continue using KICKO TrimOut.`,
    };
  }
}

export async function deactivateLicense(): Promise<{ ok: boolean; error?: string }> {
  if (DEV_BYPASS) {
    clearActivation();
    return { ok: true };
  }

  const local = getLocalActivation();
  if (!local) return { ok: false, error: 'No license is activated on this machine.' };

  const machineId = getMachineFingerprint();

  try {
    const result = await callServer('deactivate', { key: local.key, machineId });
    if (result.ok) clearActivation();
    return result;
  } catch (err) {
    logger.error('[license] deactivation error', err);
    return { ok: false, error: 'Connection failed — could not deactivate. Try again when online.' };
  }
}
