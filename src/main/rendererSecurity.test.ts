import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { isTrustedRendererUrl } from './rendererSecurity';

const rendererEntryPath = resolve('out/renderer/index.html');

describe('renderer navigation policy', () => {
  it('allows only the packaged renderer entry in production', () => {
    expect(isTrustedRendererUrl(pathToFileURL(rendererEntryPath).toString(), { isDev: false, rendererEntryPath })).toBe(true);
    expect(isTrustedRendererUrl('https://example.com/', { isDev: false, rendererEntryPath })).toBe(false);
    expect(isTrustedRendererUrl(pathToFileURL(resolve('out/renderer/other.html')).toString(), { isDev: false, rendererEntryPath })).toBe(false);
  });

  it('allows the configured development origin without allowing credentials or another port', () => {
    expect(isTrustedRendererUrl('http://localhost:3001/settings', { isDev: true, rendererEntryPath })).toBe(true);
    expect(isTrustedRendererUrl('http://localhost:3002/', { isDev: true, rendererEntryPath })).toBe(false);
    expect(isTrustedRendererUrl('http://user:password@localhost:3001/', { isDev: true, rendererEntryPath })).toBe(false);
  });
});
