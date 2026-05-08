import { app } from 'electron';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import YTDlpWrap from 'yt-dlp-wrap';
import logger from './logger.js';
import { isWindows } from './util.js';

let _wrap: YTDlpWrap | null = null;

function getBinaryPath() {
  const name = isWindows ? 'yt-dlp.exe' : 'yt-dlp';
  return join(app.getPath('userData'), name);
}

async function getWrap(): Promise<YTDlpWrap> {
  if (_wrap) return _wrap;
  const binPath = getBinaryPath();
  if (!existsSync(binPath)) {
    logger.info('yt-dlp not found, downloading…', binPath);
    await YTDlpWrap.downloadFromGithub(binPath);
    logger.info('yt-dlp downloaded');
  }
  _wrap = new YTDlpWrap(binPath);
  return _wrap;
}

export interface YtdlpProgress {
  percent: number;   // 0-100
  speed: string;
  eta: string;
}

export async function downloadVideo(
  url: string,
  outDir: string,
  onProgress: (p: YtdlpProgress) => void,
): Promise<string> {
  const wrap = await getWrap();

  // Output template: title.ext — sanitised
  const outTemplate = join(outDir, '%(title)s.%(ext)s');
  logger.info('yt-dlp download', url, outDir);

  let lastFile = '';

  await new Promise<void>((resolve, reject) => {
    const em = wrap.exec([
      url,
      '-o', outTemplate,
      '--no-playlist',
      '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
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
