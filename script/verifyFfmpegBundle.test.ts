// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, it } from 'vitest';

import { findMissingFfmpegBundleEntries } from './verifyFfmpegBundle.js';

describe('Windows FFmpeg release bundle', () => {
  it('requires both executables and every runtime DLL family', () => {
    expect(findMissingFfmpegBundleEntries([])).toEqual([
      'ffmpeg.exe',
      'ffprobe.exe',
      'avcodec-<version>.dll',
      'avformat-<version>.dll',
      'avutil-<version>.dll',
      'swresample-<version>.dll',
      'swscale-<version>.dll',
    ]);
    expect(findMissingFfmpegBundleEntries([
      'ffmpeg.exe',
      'ffprobe.exe',
      'avcodec-62.dll',
      'avformat-62.dll',
      'avutil-60.dll',
      'swresample-6.dll',
      'swscale-9.dll',
    ])).toEqual([]);
  });
});
