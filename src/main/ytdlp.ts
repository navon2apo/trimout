// eslint-disable-next-line import/no-extraneous-dependencies
import { app } from 'electron';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import logger from './logger.js';
import { isWindows } from './util.js';

// yt-dlp-wrap is CommonJS — `exports.default = YTDlpWrap`. When bundled by electron-vite
// the ESM `import YTDlpWrap from 'yt-dlp-wrap'` sometimes yields `{ default: { default: cls } }`
// (double-wrapped) which breaks `YTDlpWrap.downloadFromGithub(…)`. The most reliable workaround
// is to use native createRequire and walk to the real class through any `.default` chain.
const requireCjs = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let resolved: any = requireCjs('yt-dlp-wrap');
// Drill through any nested `.default` wrappers until we find the real class (which has
// `downloadFromGithub` as a static method).
let safety = 0;
while (resolved && typeof resolved.downloadFromGithub !== 'function' && resolved.default && safety < 5) {
  resolved = resolved.default;
  safety += 1;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YTDlpWrap: any = resolved;

// eslint-disable-next-line no-underscore-dangle, @typescript-eslint/no-explicit-any
let _wrap: any = null;

function getBinaryPath() {
  const name = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
  return join(app.getPath('userData'), name);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getWrap(onBootstrap?: () => void): Promise<any> {
  if (_wrap) return _wrap;
  const binPath = getBinaryPath();
  if (!existsSync(binPath)) {
    logger.info('yt-dlp not found, downloading…', binPath);
    onBootstrap?.();
    try {
      // downloadFromGithub is a static method on the class
      if (typeof YTDlpWrap.downloadFromGithub !== 'function') {
        throw new TypeError(`yt-dlp-wrap API mismatch — downloadFromGithub not found. Keys: ${Object.keys(YTDlpWrap).join(',')}`);
      }
      await YTDlpWrap.downloadFromGithub(binPath);
      logger.info('yt-dlp downloaded successfully');
    } catch (err) {
      logger.error('Failed to download yt-dlp from GitHub:', err);
      throw new Error(`Failed to download yt-dlp from GitHub. Antivirus or firewall software may be blocking it. ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  _wrap = new YTDlpWrap(binPath);
  return _wrap;
}

export interface YtdlpProgress {
  percent: number; // 0-100
  speed: string;
  eta: string;
}

/**
 * A simplified, user-friendly format option built from yt-dlp's --dump-json output.
 * One entry per resolution bucket (we pick the best codec/container available for each).
 */
export interface VideoFormatOption {
  /** Format selector to pass back to `downloadVideo` (e.g. "137+bestaudio" or "best") */
  formatSelector: string;
  /** Display height — e.g. 1080 means "1080p". null if unknown. */
  height: number | null;
  /** Display label — e.g. "1080p", "4K" */
  label: string;
  /** Estimated file size in bytes (may be approximate). null if unknown. */
  filesize: number | null;
  /** Video codec — e.g. "h264", "vp9", "av1" */
  codec: string;
  /** Container after merge — usually "mp4" */
  container: string;
  /** Frames per second (e.g. 30, 60). null if unknown. */
  fps: number | null;
  /** True for the recommended format (best for parents — usually 1080p H.264). */
  recommended?: boolean;
}

export interface VideoInfo {
  title: string;
  durationSec: number | null;
  thumbnail: string | null;
  formats: VideoFormatOption[];
}

/**
 * List all available qualities for a URL without downloading anything.
 * Uses yt-dlp's --dump-json which makes one HTTP request and returns a manifest.
 */
export async function listVideoFormats(url: string, onBootstrap?: () => void): Promise<VideoInfo> {
  const wrap = await getWrap(onBootstrap);
  logger.info('yt-dlp listing formats');

  // Run yt-dlp --dump-json and capture stdout as JSON
  const stdout: string = await new Promise((resolve, reject) => {
    let buf = '';
    const em = wrap.exec([url, '--dump-json', '--no-playlist', '--no-warnings']);
    em.ytDlpProcess?.stdout?.on('data', (d: Buffer) => { buf += d.toString(); });
    em.on('error', reject);
    em.on('close', () => resolve(buf));
  });

  if (!stdout.trim()) throw new Error('yt-dlp returned no metadata');

  const data = JSON.parse(stdout.trim().split('\n')[0]!);
  const title: string = data.title ?? 'Untitled';
  const durationSec: number | null = typeof data.duration === 'number' ? data.duration : null;
  const thumbnail: string | null = typeof data.thumbnail === 'string' ? data.thumbnail : null;

  // Group raw formats by height, picking the best codec+filesize per bucket
  interface RawFormat {
    format_id: string;
    height?: number;
    fps?: number;
    vcodec?: string;
    acodec?: string;
    ext?: string;
    filesize?: number;
    filesize_approx?: number;
    tbr?: number;
  }
  const rawFormats: RawFormat[] = Array.isArray(data.formats) ? data.formats : [];

  // Keep only video-bearing formats (vcodec != 'none')
  const videoFormats = rawFormats.filter((f) => f.vcodec && f.vcodec !== 'none' && f.height);
  if (videoFormats.length === 0) throw new Error('No video formats found for this URL');

  // Bucket by height — keep best per bucket (highest tbr / filesize)
  const byHeight = new Map<number, RawFormat>();
  for (const f of videoFormats) {
    const h = f.height!;
    const existing = byHeight.get(h);
    if (!existing) {
      byHeight.set(h, f);
    } else {
      // Prefer formats with explicit filesize
      const fSize = f.filesize ?? f.filesize_approx ?? 0;
      const eSize = existing.filesize ?? existing.filesize_approx ?? 0;
      // Prefer h264 (mp4) over vp9/av1 when sizes are comparable — better device compatibility
      const fIsH264 = (f.vcodec ?? '').startsWith('avc') || (f.vcodec ?? '').startsWith('h264');
      const eIsH264 = (existing.vcodec ?? '').startsWith('avc') || (existing.vcodec ?? '').startsWith('h264');
      if (fIsH264 && !eIsH264) {
        byHeight.set(h, f);
      } else if (!fIsH264 && eIsH264) {
        // keep existing h264 — no-op
      } else if (fSize > eSize) {
        byHeight.set(h, f);
      }
    }
  }

  // Sort descending by height
  const sortedHeights = [...byHeight.keys()].sort((a, b) => b - a);

  const labelFor = (h: number): string => {
    if (h >= 2160) return '4K';
    if (h >= 1440) return '1440p';
    return `${h}p`;
  };

  const codecLabel = (v: string | undefined): string => {
    if (!v) return '?';
    if (v.startsWith('avc') || v.startsWith('h264')) return 'H.264';
    if (v.startsWith('vp9')) return 'VP9';
    if (v.startsWith('av01') || v.startsWith('av1')) return 'AV1';
    return v.split('.')[0] ?? v;
  };

  // Build the options list — every video format gets paired with bestaudio
  const formats: VideoFormatOption[] = sortedHeights.map((h) => {
    const f = byHeight.get(h)!;
    const hasAudioInStream = f.acodec && f.acodec !== 'none';
    const formatSelector = hasAudioInStream ? f.format_id : `${f.format_id}+bestaudio/${f.format_id}`;
    return {
      formatSelector,
      height: h,
      label: labelFor(h),
      filesize: f.filesize ?? f.filesize_approx ?? null,
      codec: codecLabel(f.vcodec),
      container: 'mp4', // we always merge to mp4
      fps: f.fps ?? null,
    };
  });

  // Mark 1080p as recommended (or the highest available below 1080p)
  const recommendedIndex = formats.findIndex((f) => f.height === 1080)
    ?? formats.findIndex((f) => (f.height ?? 0) <= 1080);
  if (recommendedIndex !== undefined && recommendedIndex >= 0 && formats[recommendedIndex]) {
    formats[recommendedIndex].recommended = true;
  }

  return { title, durationSec, thumbnail, formats };
}

export async function downloadVideo(
  url: string,
  outDir: string,
  onProgress: (p: YtdlpProgress) => void,
  onBootstrap?: () => void,
  formatSelector?: string,
): Promise<string> {
  const wrap = await getWrap(onBootstrap);

  // Output template: title.ext — sanitised
  const outTemplate = join(outDir, '%(title)s.%(ext)s');
  logger.info('yt-dlp download', outDir, 'format:', formatSelector ?? 'default');

  let lastFile = '';

  await new Promise<void>((resolve, reject) => {
    const em = wrap.exec([
      url,
      '-o', outTemplate,
      '--no-playlist',
      '--format', formatSelector ?? 'bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4',
      '--newline',
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    em.on('progress', (p: any) => {
      onProgress({ percent: p?.percent ?? 0, speed: p?.currentSpeed ?? '', eta: p?.eta ?? '' });
    });

    em.on('ytDlpEvent', (eventType: string, eventData: string) => {
      if (eventType === 'download' && eventData.includes('Destination:')) {
        const match = eventData.match(/Destination:\s*(.+)/);
        if (match?.[1]) lastFile = match[1].trim();
      }
      if (eventType === 'merger' && eventData.includes('Merging')) {
        const match = eventData.match(/"([^"]+\.mp4)"/);
        if (match?.[1]) lastFile = match[1].trim();
      }
    });

    em.on('error', reject);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    em.on('close', () => resolve());
  });

  // If we didn't capture the filename, find the newest mp4 in outDir
  if (!lastFile || !existsSync(lastFile)) {
    const { readdirSync, statSync } = await import('node:fs');
    const files = readdirSync(outDir)
      .map((f) => ({ f, t: statSync(join(outDir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    const mp4 = files.find((x) => x.f.endsWith('.mp4') || x.f.endsWith('.mkv') || x.f.endsWith('.webm'));
    if (mp4) lastFile = join(outDir, mp4.f);
  }

  logger.info('yt-dlp finished, file:', lastFile);
  return lastFile;
}

/** Check if a string looks like a supported URL */
export function isSupportedUrl(text: string): boolean {
  try {
    const u = new URL(text.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
