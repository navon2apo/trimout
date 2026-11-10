// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';

import { buildMusicArgs, cleanMusicVolume, DEFAULT_MUSIC_VOLUME } from './music';

const base = { videoPath: 'in.mp4', musicPath: 'song.mp3', outPath: 'out.mp4', duration: 30, volume: 50 };

describe('music on the merged video', () => {
  it('mixes with the game sound, at the chosen volume, fading in and out', () => {
    const filter = buildMusicArgs({ ...base, mode: 'mix', videoHasAudio: true }).join(' ');
    expect(filter).toContain('amix=inputs=2:duration=first:normalize=0');
    expect(filter).toContain('volume=0.500');
    expect(filter).toContain('afade=t=in');
    expect(filter).toContain('afade=t=out:st=28.500:d=1.500');
  });

  it('replaces the game sound when asked, or when the video has none', () => {
    expect(buildMusicArgs({ ...base, mode: 'replace', videoHasAudio: true }).join(' ')).not.toContain('amix');
    expect(buildMusicArgs({ ...base, mode: 'mix', videoHasAudio: false }).join(' ')).not.toContain('amix');
  });

  it('repeats a short song, cuts it to the video and copies the picture', () => {
    const args = buildMusicArgs({ ...base, mode: 'replace', videoHasAudio: true });
    expect(args.join(' ')).toContain('-stream_loop -1 -i song.mp3');
    expect(args).toContain('-t');
    expect(args[args.indexOf('-t') + 1]).toBe('30.000');
    expect(args[args.indexOf('-c:v') + 1]).toBe('copy');
  });

  it('keeps fades short on a very short video', () => {
    const filter = buildMusicArgs({ ...base, duration: 2, mode: 'replace', videoHasAudio: false }).join(' ');
    expect(filter).toContain('afade=t=in:st=0:d=0.500');
  });

  it('keeps the volume setting between 0 and 100', () => {
    expect(cleanMusicVolume(150)).toBe(100);
    expect(cleanMusicVolume(-5)).toBe(0);
    expect(cleanMusicVolume('loud')).toBe(DEFAULT_MUSIC_VOLUME);
  });
});
