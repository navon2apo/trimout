export interface SecureApiKeyBackend {
  get: (key: string) => unknown;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
}

export interface SecureApiKeyEncryption {
  isAvailable: () => boolean;
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
}

const API_KEY_ID_RE = /^[a-z0-9_-]{1,64}$/i;

function getStorageKey(id: string) {
  const normalized = String(id || '').trim();
  if (!API_KEY_ID_RE.test(normalized)) throw new TypeError('The API key identifier is invalid.');
  return `key_${normalized}`;
}

export function createSecureApiKeyStore({
  secureBackend,
  legacyBackend,
  encryption,
}: {
  secureBackend: SecureApiKeyBackend;
  legacyBackend?: SecureApiKeyBackend;
  encryption: SecureApiKeyEncryption;
}) {
  function requireEncryption() {
    if (!encryption.isAvailable()) throw new Error('Secure operating-system storage is unavailable.');
  }

  function encryptAndStore(storageKey: string, value: string) {
    requireEncryption();
    const ciphertext = encryption.encrypt(value);
    if (!ciphertext || ciphertext === value) throw new Error('Secure storage did not encrypt the API key.');
    secureBackend.set(storageKey, ciphertext);
  }

  return {
    get(id: string) {
      const storageKey = getStorageKey(id);
      const ciphertext = secureBackend.get(storageKey);
      if (typeof ciphertext === 'string' && ciphertext.length > 0) {
        requireEncryption();
        return encryption.decrypt(ciphertext);
      }

      const legacyValue = legacyBackend?.get(storageKey);
      if (typeof legacyValue !== 'string' || legacyValue.length === 0) return '';

      encryptAndStore(storageKey, legacyValue);
      legacyBackend?.delete(storageKey);
      return legacyValue;
    },

    set(id: string, input: string) {
      const storageKey = getStorageKey(id);
      const value = String(input || '').trim();
      if (!value) {
        secureBackend.delete(storageKey);
        legacyBackend?.delete(storageKey);
        return;
      }

      encryptAndStore(storageKey, value);
      legacyBackend?.delete(storageKey);
    },
  };
}
