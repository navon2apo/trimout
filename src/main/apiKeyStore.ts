import { safeStorage } from 'electron';

import { createSecureApiKeyStore } from './secureApiKeyStore.js';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Store = require('electron-store');

const secureBackend = new Store({ name: 'api-keys-secure' });

// Read only for one-time migration from releases that used electron-store's
// static encryption key. Migrated values are deleted from this legacy store.
const legacyBackend = new Store({ name: 'api-keys', encryptionKey: 'trimout-api-keys-v1' });

const apiKeys = createSecureApiKeyStore({
  secureBackend,
  legacyBackend,
  encryption: {
    isAvailable: () => safeStorage.isEncryptionAvailable(),
    encrypt: (value) => safeStorage.encryptString(value).toString('base64'),
    decrypt: (value) => safeStorage.decryptString(Buffer.from(value, 'base64')),
  },
});

export function getApiKey(id: string) {
  return apiKeys.get(id);
}

export function setApiKey(id: string, value: string) {
  apiKeys.set(id, value);
}
