import { execa } from 'execa';
import { app } from 'electron';
import { join } from 'node:path';
import { isWindows } from './util.js';
import logger from './logger.js';

export interface Segment { start: number; end: number }
export interface Peak { time: number; level: number }

function getFfmpegPath() {
  const exeName = isWindows ? 'ffmpeg.exe' : 'ffmpeg';
  if (app.isPackaged) return join(process.resourcesPath, exeName);
  const parts = ['ffmpeg', `${process.platform}-${process.arch}`];
  if (isWindows || process.platform === 'linux') parts.push('lib');
  parts.push(exeName);
  return join(...parts);
}

/** Run ffmpeg and return stderr as text */
async function runFfmpegText(args: string[]): Promise<string> {
  logger.info('aiAnalysis ffmpeg', args.join(' '));
  const result = await execa(getFfmpegPath(), args, { encoding: 'utf8', reject: false });
  return (result.stderr as string) ?? '';
}

/** Detect silence intervals. Returns non-silent (speech/sound) segments. */
export async function detectSpeechSegments(
  filePath: string,
  noisedB = -30,
  minDuration = 0.5,
): Promise<Segment[]> {
  const args = [
    '-hide_banner', '-i', filePath,
    '-af', `silencedetect=noise=${noisedB}dB:duration=${minDuration}`,
    '-f', 'null', '-',
  ];
  const stderr = await runFfmpegText(args);

  // Parse silence intervals
  const silences: Segment[] = [];
  const startRe = /silence_start:\s*([\d.]+)/g;
  const endRe = /silence_end:\s*([\d.]+)/g;
  let ms: RegExpExecArray | null;
  let me: RegExpExecArray | null;
  const starts: number[] = [];
  const ends: number[] = [];

  // eslint-disable-next-line no-cond-assign
  while ((ms = startRe.exec(stderr)) !== null) starts.push(parseFloat(ms[1]!));
  // eslint-disable-next-line no-cond-assign
  while ((me = endRe.exec(stderr)) !== null) ends.push(parseFloat(me[1]!));

  // Build silence list (handle leading silence: if first end has no start, start=0)
  const silStart = starts.length < ends.length ? [0, ...starts] : starts;
  for (let i = 0; i < Math.min(silStart.length, ends.length); i++) {
    silences.push({ start: silStart[i]!, end: ends[i]! });
  }

  // Get total duration
  const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  let totalDuration = 9999;
  if (durationMatch) {
    totalDuration =
      parseInt(durationMatch[1]!, 10) * 3600 +
      parseInt(durationMatch[2]!, 10) * 60 +
      parseFloat(durationMatch[3]!);
  }

  // Invert: speech = gaps between silence intervals
  const speech: Segment[] = [];
  let cursor = 0;
  for (const sil of silences) {
    if (sil.start - cursor > 0.1) speech.push({ start: cursor, end: sil.start });
    cursor = sil.end;
  }
  if (totalDuration - cursor > 0.1) speech.push({ start: cursor, end: totalDuration });

  return speech;
}

/** Find energy peaks (loud moments). Returns timestamps of peak moments. */
export async function detectEnergyPeaks(
  filePath: string,
  thresholdDb = -18,
  minDuration = 0.3,
): Promise<Segment[]> {
  // Energy peaks = sections NOT silent at a louder threshold
  return detectSpeechSegments(filePath, thresholdDb, minDuration);
}

/** Detect scene changes, return timestamps */
export async function detectSceneChanges(
  filePath: string,
  threshold = 0.3,
): Promise<number[]> {
  const args = [
    '-hide_banner', '-i', filePath,
    '-vf', `select='gt(scene\\,${threshold})',metadata=print:file=-`,
    '-f', 'null', '-',
  ];
  const stderr = await runFfmpegText(args);
  const times: number[] = [];
  const re = /pts_time:([\d.]+)/g;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(stderr)) !== null) times.push(parseFloat(m[1]!));
  return times;
}
