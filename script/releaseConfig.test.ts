import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type ExtraResource = { from: string, to: string };

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  productName: string,
  version: string,
  scripts: Record<string, string>,
  build: {
    appId: string,
    extraResources: ExtraResource[],
    win: { target: Array<{ arch: string, target: string }> },
    nsis: { license: string },
  },
};

describe('Windows release configuration', () => {
  it('uses the KICKO TrimOut Windows identity and installer target', () => {
    expect(packageJson.productName).toBe('KICKO TrimOut');
    expect(packageJson.version).toBe('1.2.0');
    expect(packageJson.build.appId).toBe('com.kicko.trimout');
    expect(packageJson.build.win.target).toEqual([{ arch: 'x64', target: 'nsis' }]);
  });

  it('packages only the English locale and required user notices', () => {
    const localeResources = packageJson.build.extraResources.filter(({ from }) => from.startsWith('locales'));
    expect(localeResources).toEqual([{ from: 'locales/en', to: 'locales/en' }]);

    const packagedFiles = new Set(packageJson.build.extraResources.map(({ from }) => from));
    expect(packagedFiles).toEqual(new Set([
      'locales/en',
      'LICENSE',
      'NOTICE.md',
      'PRIVACY.md',
      'licenses.txt',
      'FFMPEG-LICENSE.txt',
    ]));
    expect(packageJson.build.nsis.license).toBe('LICENSE');
  });

  it('fails a public release when signing is absent or unsuccessful', () => {
    expect(packageJson.scripts['release-win']).toContain('verifyWindowsSigningEnv.ts');
    expect(packageJson.scripts['release-win']).toContain('forceCodeSigning=true');
  });
});
