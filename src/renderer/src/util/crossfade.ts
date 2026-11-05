/**
 * Merged video with blended transitions (crossfade) between the clips.
 * Built from the finished clip files (after zoom / quality / aspect), so the merged video
 * carries their zooms too. One FFmpeg pass: every clip is brought to one size and frame rate,
 * then the pictures blend with `xfade` and the sound with `acrossfade`.
 */

/** The transition picked in the export screen for the merged video. */
export type ExportTransition = 'none' | 'fade-short' | 'fade-long';
export const TRANSITION_SECONDS: Record<ExportTransition, number> = { none: 0, 'fade-short': 0.5, 'fade-long': 1 };

export interface CrossfadeClip {
  path: string,
  /** Seconds, from ffprobe. */
  duration: number,
  hasAudio: boolean,
}

/** A fade never takes more than this share of the shortest clip. */
const MAX_FADE_SHARE = 1 / 3;

const num = (x: number) => String(Number(x.toFixed(3)));

/** The asked fade, shortened when a clip is too short to hold it. */
export function safeFadeDuration(durations: number[], fade: number): number {
  const shortest = Math.min(...durations);
  return Math.min(fade, shortest * MAX_FADE_SHARE);
}

/** When each transition starts, on the time line of everything joined before it. */
export function crossfadeOffsets(durations: number[], fade: number): number[] {
  const offsets: number[] = [];
  let joined = durations[0] ?? 0;
  for (let i = 1; i < durations.length; i += 1) {
    offsets.push(Number((joined - fade).toFixed(3)));
    joined += durations[i]! - fade;
  }
  return offsets;
}

export function buildCrossfadeArgs({ clips, fade, width, height, fps, crf, preset, outPath }: {
  clips: CrossfadeClip[],
  fade: number,
  width: number,
  height: number,
  fps: number,
  crf: number,
  preset: string,
  outPath: string,
}): string[] {
  const durations = clips.map((c) => c.duration);
  const d = safeFadeDuration(durations, fade);
  const offsets = crossfadeOffsets(durations, d);
  const withAudio = clips.every((c) => c.hasAudio);
  const w = Math.round(width / 2) * 2;
  const h = Math.round(height / 2) * 2;

  const parts: string[] = [];
  clips.forEach((c, i) => {
    // Same size, shape, rate and time base for every clip: xfade refuses anything else.
    // tpad + trim make the picture exactly as long as the clip, so the blends land on time.
    parts.push(`[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${num(fps)},format=yuv420p,tpad=stop_mode=clone:stop_duration=1,trim=duration=${num(c.duration)},setpts=PTS-STARTPTS,settb=AVTB[v${i}]`);
    if (withAudio) parts.push(`[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=0:${num(c.duration)},asetpts=PTS-STARTPTS[a${i}]`);
  });

  let v = 'v0';
  let a = 'a0';
  offsets.forEach((offset, k) => {
    const i = k + 1;
    parts.push(`[${v}][v${i}]xfade=transition=fade:duration=${num(d)}:offset=${num(offset)}[vx${i}]`);
    v = `vx${i}`;
    if (withAudio) {
      parts.push(`[${a}][a${i}]acrossfade=d=${num(d)}[ax${i}]`);
      a = `ax${i}`;
    }
  });

  return [
    '-hide_banner', '-y',
    ...clips.flatMap((c) => ['-i', c.path]),
    '-filter_complex', parts.join(';'),
    '-map', `[${v}]`,
    ...(withAudio ? ['-map', `[${a}]`, '-c:a', 'aac', '-b:a', '128k', '-ac', '2'] : ['-an']),
    '-c:v', 'libx264',
    '-crf', String(crf),
    '-preset', preset,
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outPath,
  ];
}
