import { describe, expect, it } from 'vitest';

import { verifyWindowsSigningEnv } from './verifyWindowsSigningEnv';

describe('Windows signing preflight', () => {
  it('fails closed when signing credentials are missing', () => {
    expect(() => verifyWindowsSigningEnv({})).toThrow('requires a complete');
    expect(() => verifyWindowsSigningEnv({ CSC_LINK: 'certificate.pfx' })).toThrow('requires a complete');
    expect(() => verifyWindowsSigningEnv({ WIN_CSC_KEY_PASSWORD: 'private-password' })).toThrow('requires a complete');
    expect(() => verifyWindowsSigningEnv({
      CSC_LINK: 'certificate.pfx',
      WIN_CSC_KEY_PASSWORD: 'private-password',
    })).toThrow('requires a complete');
  });

  it('accepts a complete generic signing configuration without returning secrets', () => {
    expect(verifyWindowsSigningEnv({
      CSC_LINK: 'certificate.pfx',
      CSC_KEY_PASSWORD: 'private-password',
    })).toEqual({ method: 'electron-builder-csc' });
  });

  it('accepts a complete Windows-specific signing configuration without returning secrets', () => {
    expect(verifyWindowsSigningEnv({
      WIN_CSC_LINK: 'certificate.pfx',
      WIN_CSC_KEY_PASSWORD: 'private-password',
    })).toEqual({ method: 'electron-builder-win-csc' });
  });
});
