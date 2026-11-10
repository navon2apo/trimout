/** Music on the merged video: replace the game sound or mix with it. All pure, so it can be tested. */

export type MusicMode = 'replace' | 'mix';

export const MUSIC_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus'];
export const DEFAULT_MUSIC_VOLUME = 60;
export const DEFAULT_MUSIC_MODE: MusicMode = 'mix';

export const isMusicMode = (value: unknown): value is MusicMode => value === 'replace' || value === 'mix';

/** The volume setting (0-100) kept to a sensible number */
export const cleanMusicVolume = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : DEFAULT_MUSIC_VOLUME);

const AUDIO = 'sample_rates=48000:channel_layouts=stereo';

/**
 * ffmpeg arguments that put the music under the video: the music is cut to the video's length (and repeats
 * if it is shorter), fades in and out, and either replaces the game sound or plays together with it.
 * The picture is copied, not encoded again.
 */
export function buildMusicArgs({ videoPath, musicPath, outPath, duration, volume, mode, videoHasAudio }: {
  videoPath: string,
  musicPath: string,
  outPath: string,
  /** Length of the video in seconds */
  duration: number,
  volume: number,
  mode: MusicMode,
  videoHasAudio: boolean,
}): string[] {
  const d = Math.max(0.1, duration);
  const fadeIn = Math.min(1, d / 4);
  const fadeOut = Math.min(1.5, d / 3);
  const gain = (cleanMusicVolume(volume) / 100).toFixed(3);
  const music = `[1:a]atrim=0:${d.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fadeIn.toFixed(3)},afade=t=out:st=${(d - fadeOut).toFixed(3)}:d=${fadeOut.toFixed(3)},volume=${gain},aformat=${AUDIO}`;
  const filter = mode === 'mix' && videoHasAudio
    ? `${music}[m];[0:a]aformat=${AUDIO}[g];[g][m]amix=inputs=2:duration=first:normalize=0[a]`
    : `${music}[a]`;
  return [
    '-hide_banner', '-y',
    '-i', videoPath,
    '-stream_loop', '-1', '-i', musicPath,
    '-filter_complex', filter,
    '-map', '0:v', '-map', '[a]',
    '-t', d.toFixed(3),
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    outPath,
  ];
}
