import { fileURLToPath } from 'node:url';

export function isTrustedRendererUrl(value: string, {
  isDev,
  rendererEntryPath,
  devOrigin = 'http://localhost:3001',
}: {
  isDev: boolean;
  rendererEntryPath: string;
  devOrigin?: string;
}) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (isDev) return url.origin === devOrigin;
    if (url.protocol !== 'file:') return false;
    return fileURLToPath(url).toLowerCase() === rendererEntryPath.toLowerCase();
  } catch {
    return false;
  }
}
