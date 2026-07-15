import { describe, expect, it, vi } from 'vitest';

import { createSecureApiKeyStore, type SecureApiKeyBackend } from './secureApiKeyStore';

function backend(initial: Record<string, unknown> = {}) {
  const values = new Map(Object.entries(initial));
  const api: SecureApiKeyBackend = {
    get: vi.fn((key) => values.get(key)),
    set: vi.fn((key, value) => values.set(key, value)),
    delete: vi.fn((key) => { values.delete(key); }),
  };
  return { api, values };
}

function dependencies({ secure = backend(), legacy = backend(), available = true } = {}) {
  return {
    secure,
    legacy,
    store: createSecureApiKeyStore({
      secureBackend: secure.api,
      legacyBackend: legacy.api,
      encryption: {
        isAvailable: () => available,
        encrypt: (value) => `encrypted:${Buffer.from(value).toString('base64')}`,
        decrypt: (value) => Buffer.from(value.replace(/^encrypted:/, ''), 'base64').toString(),
      },
    }),
  };
}

describe('secure API key store', () => {
  it('stores only encrypted values and decrypts them on read', () => {
    const { secure, store } = dependencies();
    store.set('openai', 'sk-test-secret');

    expect(secure.values.get('key_openai')).toMatch(/^encrypted:/);
    expect(secure.values.get('key_openai')).not.toContain('sk-test-secret');
    expect(store.get('openai')).toBe('sk-test-secret');
  });

  it('migrates a legacy value and deletes the old copy', () => {
    const legacy = backend({ key_openai: 'legacy-secret' });
    const { secure, store } = dependencies({ legacy });

    expect(store.get('openai')).toBe('legacy-secret');
    expect(secure.values.get('key_openai')).toMatch(/^encrypted:/);
    expect(legacy.values.has('key_openai')).toBe(false);
  });

  it('deletes both secure and legacy copies when cleared', () => {
    const secure = backend({ key_openai: 'encrypted:value' });
    const legacy = backend({ key_openai: 'legacy-value' });
    const { store } = dependencies({ secure, legacy });

    store.set('openai', '');
    expect(secure.values.has('key_openai')).toBe(false);
    expect(legacy.values.has('key_openai')).toBe(false);
  });

  it('fails closed when operating-system encryption is unavailable', () => {
    const { store } = dependencies({ available: false });
    expect(() => store.set('openai', 'secret')).toThrow('Secure operating-system storage is unavailable.');
  });
});
