/**
 * Stream URL extractor — opens a hidden Electron BrowserWindow, loads the given
 * page, and intercepts network requests to find the real streaming URL
 * (.m3u8 / .mpd / .mp4) that the site's player would fetch.
 *
 * This is how desktop downloaders like "Any Video Converter" handle sites that
 * yt-dlp doesn't have a dedicated extractor for (VEO, Pixellot, Hudl, etc.):
 * run the page's JS in a real browser engine, let IT negotiate auth / tokens
 * with the site, then grab the stream URL that pops up in the network layer.
 *
 * Returned URL + the original page URL (as Referer) is fed straight to yt-dlp
 * via its --referer option, which then does the actual download.
 */
// eslint-disable-next-line import/no-extraneous-dependencies
import { BrowserWindow, session } from 'electron';
import logger from './logger.js';

export interface ExtractedStream {
  /** The real streaming URL we intercepted (m3u8 / mpd / direct mp4). */
  streamUrl: string;
  /** The original page URL — needed as Referer when downloading. */
  pageUrl: string;
  /** Short reason label — "m3u8" / "mpd" / "mp4". */
  kind: 'm3u8' | 'mpd' | 'mp4';
  /** How many ms passed from loadURL to intercept — useful for diagnostics. */
  elapsedMs: number;
}

/**
 * Match streaming manifests + direct mp4 playlists. We ignore small .mp4
 * fragments (segments) and look for master manifests or direct full-video URLs.
 */
const STREAM_PATTERNS: { re: RegExp; kind: ExtractedStream['kind'] }[] = [
  { re: /\.m3u8(\?|$)/i, kind: 'm3u8' },
  { re: /\.mpd(\?|$)/i, kind: 'mpd' },
  // Only consider .mp4 if the URL doesn't look like a short segment
  { re: /\/[^/]+\.mp4(\?|$)/i, kind: 'mp4' },
];

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Open the page in a hidden window and resolve with the first streaming URL
 * we see. Rejects if nothing is found within `timeoutMs`.
 */
export async function extractStreamUrl(
  pageUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<ExtractedStream> {
  const startedAt = Date.now();
  logger.info('streamExtractor: opening', pageUrl);

  // Use an isolated session partition so cookies / cache don't leak into or out
  // of the user's main browser session.
  const partition = `temp-stream-extract-${Date.now()}`;
  const extractSession = session.fromPartition(partition);

  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    webPreferences: {
      partition,
      // Real-browser capabilities — the page needs JS to initialize its player
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      offscreen: false,
      // VEO uses MSE for HLS playback — autoplayPolicy must not block
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  return new Promise<ExtractedStream>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      try { win.destroy(); } catch { /* ignore */ }
      // Best-effort session cleanup
      extractSession.clearStorageData().catch(() => { /* ignore */ });
    };

    const timer = setTimeout(() => {
      if (settled) return;
      logger.warn('streamExtractor: timeout for', pageUrl);
      cleanup();
      reject(new Error('Timeout — no streaming URL found on the page. The site may require login or a click to start playback.'));
    }, timeoutMs);

    // Hook network requests
    extractSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
      if (settled) { callback({ cancel: false }); return; }

      for (const { re, kind } of STREAM_PATTERNS) {
        if (re.test(details.url)) {
          const elapsedMs = Date.now() - startedAt;
          logger.info('streamExtractor: FOUND', { kind, streamUrl: details.url, elapsedMs });
          clearTimeout(timer);
          const result: ExtractedStream = {
            streamUrl: details.url,
            pageUrl,
            kind,
            elapsedMs,
          };
          // Resolve FIRST, cleanup AFTER — otherwise destroying the window mid-request can crash.
          cleanup();
          resolve(result);
          callback({ cancel: true }); // we got what we need, stop the fetch
          return;
        }
      }
      callback({ cancel: false });
    });

    // Handle page-level errors
    win.webContents.on('did-fail-load', (_e, errorCode, errorDescription, validatedURL) => {
      // Only fail if it's the top-level navigation that failed
      if (validatedURL !== pageUrl) return;
      if (settled) return;
      clearTimeout(timer);
      cleanup();
      reject(new Error(`Could not load the page (${errorCode}): ${errorDescription}`));
    });

    // Load the page — real browser will execute all JS, cookies, auth, etc.
    win.loadURL(pageUrl).catch((err: unknown) => {
      if (settled) return;
      clearTimeout(timer);
      cleanup();
      reject(err instanceof Error ? err : new Error(String(err)));
    });
  });
}
