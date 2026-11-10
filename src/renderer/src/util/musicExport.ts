import { runFfmpeg, getFfCommandLine, readFileFfprobeMeta } from '../ffmpeg';
import { buildMusicArgs, type MusicMode } from './music';

/** Puts the music under the finished merged video (the file at outPath is written; the picture is not encoded again) */
// eslint-disable-next-line import/prefer-default-export
export async function addMusicToVideo({ videoPath, outPath, musicPath, volume, mode, appendCommandLog }: {
  videoPath: string,
  outPath: string,
  musicPath: string,
  volume: number,
  mode: MusicMode,
  appendCommandLog?: ((args: string[]) => void) | undefined,
}): Promise<void> {
  const { format, streams } = await readFileFfprobeMeta(videoPath);
  const duration = Number(format.duration ?? 0);
  if (!(duration > 0)) throw new Error('Could not read the length of the merged video');
  const args = buildMusicArgs({ videoPath, musicPath, outPath, duration, volume, mode, videoHasAudio: streams.some((s) => s.codec_type === 'audio') });
  appendCommandLog?.(args);
  console.log('[music]', getFfCommandLine('ffmpeg', args));
  await runFfmpeg(args);
}
