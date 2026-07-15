import { pathToFileURL } from 'node:url';

export function verifyWindowsSigningEnv(env: NodeJS.ProcessEnv = process.env) {
  const genericCertificate = env.CSC_LINK?.trim();
  const genericPassword = env.CSC_KEY_PASSWORD?.trim();
  const windowsCertificate = env.WIN_CSC_LINK?.trim();
  const windowsPassword = env.WIN_CSC_KEY_PASSWORD?.trim();
  const hasGenericPair = Boolean(genericCertificate && genericPassword);
  const hasWindowsPair = Boolean(windowsCertificate && windowsPassword);

  if (!hasGenericPair && !hasWindowsPair) {
    throw new Error(
      'Windows signing requires a complete CSC_LINK/CSC_KEY_PASSWORD or WIN_CSC_LINK/WIN_CSC_KEY_PASSWORD pair. No unsigned release was created.',
    );
  }

  return { method: hasWindowsPair ? 'electron-builder-win-csc' as const : 'electron-builder-csc' as const };
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  verifyWindowsSigningEnv();
  console.log('Windows signing credentials are configured. Secret values were not printed.');
}
