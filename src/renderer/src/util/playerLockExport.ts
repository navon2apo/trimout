/**
 * Puts the player lock into a finished clip file: the clip plays up to the marked moment, freezes for
 * a second and a half while the ring closes in, the name shows and the picture glides closer and back,
 * and then the clip goes on. The freeze is drawn with the same code as the preview in the app.
 */
import { runFfmpeg, getFfCommandLine, readFileFfprobeMeta } from '../ffmpeg';
import type { SpotMark } from '../types';
import { FREEZE_SECONDS, freezeFrameCount, lockSoundExpression, lockStateAt, type LockSoundId } from './playerLock';
import { drawLockFrame, ensureLockFonts } from './playerLockDraw';
import { QUALITY_PRESETS, type QualityPreset } from './qualityPresets';

const fsPromises = window.require('fs/promises') as {
  mkdtemp: (prefix: string) => Promise<string>,
  writeFile: (path: string, data: Uint8Array) => Promise<void>,
  readFile: (path: string) => Promise<Uint8Array>,
  rm: (path: string, options: { recursive: boolean, force: boolean }) => Promise<void>,
};
const nodePath = window.require('path') as { join: (...parts: string[]) => string };
const nodeOs = window.require('os') as { tmpdir: () => string };

// The sound is made at one fixed quality so the three parts of the clip always join
const AUDIO_RATE = 48_000;
const AUDIO_FORMAT = `aformat=sample_rates=${AUDIO_RATE}:channel_layouts=stereo`;

export interface PlayerLockExportOptions {
  /** The finished clip (already zoomed / reshaped) */
  inPath: string,
  outPath: string,
  /** The moment of the lock, in seconds from the start of this clip */
  atSec: number,
  /** Where the ring is on the finished clip (fractions of its picture) */
  spot: SpotMark,
  label: string,
  title: string,
  color: string,
  sound: LockSoundId,
  fps: number,
  preset: Exclude<QualityPreset, 'lossless'>,
  appendCommandLog?: ((args: string[]) => void) | undefined,
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob == null) { reject(new Error('Could not draw a frame of the lock')); return; }
      blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, 'image/png');
  });
}

export async function exportPlayerLock({ inPath, outPath, atSec, spot, label, title, color, sound, fps, preset, appendCommandLog }: PlayerLockExportOptions): Promise<void> {
  const { format, streams } = await readFileFfprobeMeta(inPath);
  const video = streams.find((s) => s.codec_type === 'video');
  const width = video?.width;
  const height = video?.height;
  if (width == null || height == null) throw new Error('Could not read the size of the clip');
  const hasAudio = streams.some((s) => s.codec_type === 'audio');
  const duration = Number(format.duration ?? 0);
  // The moment must be inside the clip, with a frame after it to continue with
  const at = Math.min(Math.max(atSec, 0), Math.max(0, duration - 1 / fps));

  // A second encode of the whole clip: a little better quality than the first, so it does not get worse twice
  const crf = Math.max(16, QUALITY_PRESETS[preset].crf - 3);
  const ffPreset = QUALITY_PRESETS[preset].preset;
  const dir = await fsPromises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'trimout-lock-'));
  const run = async (args: string[]) => {
    appendCommandLog?.(args);
    console.log('[playerLock]', getFfCommandLine('ffmpeg', args));
    await runFfmpeg(args);
  };

  try {
    // 1. The frame to freeze on
    const stillPath = nodePath.join(dir, 'still.png');
    await run(['-hide_banner', '-y', '-ss', at.toFixed(3), '-i', inPath, '-frames:v', '1', stillPath]);
    const image = await createImageBitmap(new Blob([await fsPromises.readFile(stillPath) as BlobPart], { type: 'image/png' }));

    // 2. Every frame of the freeze, drawn like the preview in the app
    await ensureLockFonts();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx == null) throw new Error('Could not draw the lock');
    const frames = freezeFrameCount(fps);
    for (let f = 0; f < frames; f += 1) {
      const time = ((f + 1) / frames) * FREEZE_SECONDS; // the last frame is the finished state: back to the normal picture
      drawLockFrame(ctx, image, { width, height, spot, label, title, color, state: lockStateAt(time), time });
      // eslint-disable-next-line no-await-in-loop
      await fsPromises.writeFile(nodePath.join(dir, `f${String(f + 1).padStart(4, '0')}.png`), await canvasToPng(canvas));
    }
    image.close();

    // 3. The freeze as a small video, with the lock sound (or silence)
    const freezePath = nodePath.join(dir, 'freeze.mp4');
    const soundSource = sound === 'off'
      ? `anullsrc=r=${AUDIO_RATE}:cl=stereo`
      : `aevalsrc=exprs='${lockSoundExpression(sound)}|${lockSoundExpression(sound)}':s=${AUDIO_RATE}:d=${FREEZE_SECONDS}`;
    await run([
      '-hide_banner', '-y',
      '-framerate', String(fps), '-i', nodePath.join(dir, 'f%04d.png'),
      ...(hasAudio ? ['-f', 'lavfi', '-i', soundSource] : []),
      '-t', String(FREEZE_SECONDS),
      '-c:v', 'libx264', '-crf', String(crf), '-preset', ffPreset, '-pix_fmt', 'yuv420p',
      ...(hasAudio ? ['-c:a', 'aac', '-b:a', '128k', '-ac', '2'] : []),
      freezePath,
    ]);

    // 4. Before the moment + the freeze + after the moment
    const t = at.toFixed(3);
    const videoParts = [
      `[0:v]trim=end=${t},setpts=PTS-STARTPTS,setsar=1[v0]`,
      `[1:v]fps=${fps},setpts=PTS-STARTPTS,setsar=1,format=yuv420p[v1]`,
      `[0:v]trim=start=${t},setpts=PTS-STARTPTS,setsar=1[v2]`,
    ];
    const audioParts = hasAudio ? [
      `[0:a]atrim=end=${t},asetpts=PTS-STARTPTS,${AUDIO_FORMAT}[a0]`,
      `[1:a]asetpts=PTS-STARTPTS,${AUDIO_FORMAT}[a1]`,
      `[0:a]atrim=start=${t},asetpts=PTS-STARTPTS,${AUDIO_FORMAT}[a2]`,
    ] : [];
    const concat = hasAudio ? '[v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1[v][a]' : '[v0][v1][v2]concat=n=3:v=1:a=0[v]';
    await run([
      '-hide_banner', '-y',
      '-i', inPath, '-i', freezePath,
      '-filter_complex', [...videoParts, ...audioParts, concat].join(';'),
      '-map', '[v]', ...(hasAudio ? ['-map', '[a]'] : []),
      '-c:v', 'libx264', '-crf', String(crf), '-preset', ffPreset, '-pix_fmt', 'yuv420p',
      ...(hasAudio ? ['-c:a', 'aac', '-b:a', '128k', '-ac', '2'] : []),
      '-movflags', '+faststart',
      outPath,
    ]);
  } finally {
    await fsPromises.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
