// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';

import { createKickoHandoffSessionStore, type KickoHandoffSession } from './kickoHandoffSessionStore.js';

const NOW = Date.parse('2026-07-13T12:00:00.000Z');
const DEVICE_SECRET = 's'.repeat(43);

function session(overrides: Partial<KickoHandoffSession> = {}): KickoHandoffSession {
  return {
    projectId: 'project_12345678',
    handoffId: '10000000-0000-4000-8000-000000000001',
    baseUrl: 'https://kicko.example',
    expiresAt: '2026-07-13T12:10:00.000Z',
    snapshotHash: 'a'.repeat(64),
    userCode: 'ABCD-2345',
    verificationUrl: 'https://kicko.example/mvp/trimout-connect.html?code=ABCD-2345',
    deviceSecret: DEVICE_SECRET,
    ...overrides,
  };
}

function harness({ encryptionAvailable = true } = {}) {
  let persisted: unknown = {};
  const store = createKickoHandoffSessionStore({
    backend: {
      read: () => persisted,
      write: (value) => { persisted = structuredClone(value); },
    },
    encryption: {
      isAvailable: () => encryptionAvailable,
      encrypt: (value) => Buffer.from(`encrypted:${value}`).toString('base64'),
      decrypt: (value) => Buffer.from(value, 'base64').toString().replace(/^encrypted:/, ''),
    },
    now: () => NOW,
  });
  return { store, persisted: () => persisted };
}

describe('KICKO handoff session storage', () => {
  it('persists only OS-encrypted capability material outside the project file', () => {
    const { store, persisted } = harness();
    expect(store.saveSession(session())).toEqual({ saved: true });
    expect(JSON.stringify(persisted())).not.toContain(DEVICE_SECRET);
    expect(JSON.stringify(persisted())).toContain('secretCiphertext');
    expect(store.loadSession('project_12345678')).toEqual(session());
  });

  it('fails closed to memory-only behavior when secure storage is unavailable', () => {
    const { store, persisted } = harness({ encryptionAvailable: false });
    expect(store.saveSession(session())).toEqual({ saved: false, reason: 'secure_storage_unavailable' });
    expect(persisted()).toEqual({});
    expect(store.loadSession('project_12345678')).toBeNull();
  });

  it('prunes expired and corrupted sessions instead of returning a secret', () => {
    const { store, persisted } = harness();
    expect(() => store.saveSession(session({ expiresAt: '2026-07-13T11:59:00.000Z' }))).toThrow('expiry is invalid');
    store.saveSession(session());
    const records = persisted() as Record<string, { secretCiphertext: string }>;
    records['project_12345678']!.secretCiphertext = 'not-valid-encryption';
    expect(store.loadSession('project_12345678')).toBeNull();
    expect(persisted()).toEqual({});
  });
});
