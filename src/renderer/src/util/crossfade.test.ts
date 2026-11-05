import { describe, expect, it } from 'vitest';

import { buildCrossfadeArgs, crossfadeOffsets, safeFadeDuration } from './crossfade';

describe('crossfadeOffsets', () => {
  it('each transition starts one fade before the end of everything joined so far', () => {
    // 10 s + 8 s + 6 s with a 1 s fade: 2nd clip fades in at 9, 3rd at 10 + 8 - 2 = 16
    expect(crossfadeOffsets([10, 8, 6], 1)).toEqual([9, 16]);
  });

  it('no transitions for a single clip', () => {
    expect(crossfadeOffsets([12], 0.5)).toEqual([]);
  });
});

describe('safeFadeDuration', () => {
  it('keeps the asked fade when every clip is long enough', () => {
    expect(safeFadeDuration([10, 8], 0.5)).toBe(0.5);
  });

  it('shortens the fade so it never eats more than a third of the shortest clip', () => {
    expect(safeFadeDuration([10, 1.5], 1)).toBeCloseTo(0.5);
  });
});

describe('buildCrossfadeArgs', () => {
  const clips = [
    { path: 'a.mp4', duration: 10, hasAudio: true },
    { path: 'b.mp4', duration: 8, hasAudio: true },
    { path: 'c.mp4', duration: 6, hasAudio: true },
  ];
  const base = { clips, fade: 1, width: 1920, height: 1080, fps: 25, crf: 23, preset: 'medium', outPath: 'out.mp4' };

  it('reads every clip and writes one H.264 video', () => {
    const args = buildCrossfadeArgs(base);
    expect(args.filter((a) => a === '-i')).toHaveLength(3);
    expect(args.slice(args.indexOf('-i'), args.indexOf('-i') + 2)).toEqual(['-i', 'a.mp4']);
    expect(args).toContain('libx264');
    expect(args.at(-1)).toBe('out.mp4');
  });

  it('brings every clip to the same size and frame rate before blending (zoomed clips differ in size)', () => {
    const graph = buildCrossfadeArgs(base)[buildCrossfadeArgs(base).indexOf('-filter_complex') + 1]!;
    expect(graph).toContain('[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080');
    expect(graph.match(/fps=25/g)).toHaveLength(3);
  });

  it('blends the pictures at the right moments and the sound with them', () => {
    const args = buildCrossfadeArgs(base);
    const graph = args[args.indexOf('-filter_complex') + 1]!;
    expect(graph).toContain('xfade=transition=fade:duration=1:offset=9');
    expect(graph).toContain('xfade=transition=fade:duration=1:offset=16');
    expect(graph.match(/acrossfade=d=1/g)).toHaveLength(2);
    expect(args).toContain('aac');
  });

  it('cuts every sound track to its clip length so the blends stay in step with the picture', () => {
    const graph = buildCrossfadeArgs(base)[buildCrossfadeArgs(base).indexOf('-filter_complex') + 1]!;
    expect(graph).toContain('[1:a]aformat=sample_rates=48000:channel_layouts=stereo,apad,atrim=0:8');
  });

  it('a video without sound comes out without sound instead of failing', () => {
    const args = buildCrossfadeArgs({ ...base, clips: clips.map((c, i) => ({ ...c, hasAudio: i !== 1 })) });
    const graph = args[args.indexOf('-filter_complex') + 1]!;
    expect(graph).not.toContain('acrossfade');
    expect(args).toContain('-an');
  });

  it('a fade too long for a short clip is shortened', () => {
    const args = buildCrossfadeArgs({ ...base, clips: [clips[0]!, { ...clips[1]!, duration: 1.5 }] });
    const graph = args[args.indexOf('-filter_complex') + 1]!;
    expect(graph).toContain('xfade=transition=fade:duration=0.5:offset=9.5');
  });
});
