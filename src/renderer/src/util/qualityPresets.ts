/**
 * Quality presets + aspect-ratio re-encode pipeline.
 * Adds an FFmpeg pass after the lossless cut: H.264 + CRF, optionally with
 * an aspect-ratio change (9:16 / 16:9 / 1:1) using either center-crop or
 * black-bar padding.
 */
import { runFfmpeg, getFfCommandLine } from '../ffmpeg';

export type QualityPreset = 'lossless' | 'high' | 'balanced' | 'small';

export const QUALITY_PRESETS: Record<Exclude<QualityPreset, 'lossless'>, { crf: number; preset: string; label: string; description: string }> = {
  high: { crf: 18, preset: 'slow', label: 'High quality', description: 'Maximum quality, larger file' },
  balanced: { crf: 23, preset: 'medium', label: 'Balanced', description: 'Balanced quality and file size (recommended)' },
  small: { crf: 28, preset: 'medium', label: 'Small file', description: 'Faster sharing for WhatsApp and mobile' },
};

// ── Aspect ratio output ───────────────────────────────────────────────────────
export type AspectRatio = 'original' | '9:16' | '16:9' | '1:1';
export type FitMode = 'crop' | 'pad';

interface AspectSpec { w: number; h: number; ratio: string }
const ASPECT_DIMENSIONS: Record<Exclude<AspectRatio, 'original'>, AspectSpec> = {
  '9:16': { w: 1080, h: 1920, ratio: '9/16' },
  '16:9': { w: 1920, h: 1080, ratio: '16/9' },
  '1:1': { w: 1080, h: 1080, ratio: '1' },
};

/** Returns an FFmpeg -vf filter string for the requested aspect/fit, or null for "original". */
export function buildAspectFilter(aspectRatio: AspectRatio, fitMode: FitMode): string | null {
  if (aspectRatio === 'original') return null;
  const { w, h, ratio } = ASPECT_DIMENSIONS[aspectRatio];

  if (fitMode === 'crop') {
    // Center-crop to exact aspect, then scale to target dimensions.
    // - If input is wider than target → crop horizontally
    // - If input is taller than target → crop vertically
    if (aspectRatio === '1:1') {
      return `crop='min(iw,ih)':'min(iw,ih)',scale=${w}:${h}`;
    }
    return `crop='if(gt(a,${ratio}),ih*${ratio},iw)':'if(gt(a,${ratio}),ih,iw/(${ratio}))',scale=${w}:${h}`;
  }

  // Pad mode: fit inside target, fill the rest with black bars.
  return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black`;
}

export interface CompressOptions {
  inPath: string;
  outPath: string;
  preset: Exclude<QualityPreset, 'lossless'>;
  /** Output aspect ratio. 'original' = no geometry change. Default: 'original'. */
  aspectRatio?: AspectRatio;
  /** How to handle the aspect mismatch. 'crop' loses content, 'pad' adds black bars. */
  fitMode?: FitMode;
  appendCommandLog?: (args: string[]) => void;
}

/**
 * Compress a single lossless-cut MP4 with H.264 + CRF, optionally changing aspect ratio.
 * Audio re-encoded to AAC 128k for WhatsApp/mobile compatibility.
 */
export async function compressClip({
  inPath,
  outPath,
  preset,
  aspectRatio = 'original',
  fitMode = 'crop',
  appendCommandLog,
}: CompressOptions): Promise<void> {
  const { crf, preset: ffPreset } = QUALITY_PRESETS[preset];
  const vf = buildAspectFilter(aspectRatio, fitMode);

  const args = [
    '-hide_banner', '-y',
    '-i', inPath,
    '-c:v', 'libx264',
    '-crf', String(crf),
    '-preset', ffPreset,
    ...(vf ? ['-vf', vf] : []),
    '-pix_fmt', 'yuv420p', // broad compatibility
    '-movflags', '+faststart', // web/mobile streaming
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',
    outPath,
  ];

  appendCommandLog?.(args);
  console.log('[compressClip]', getFfCommandLine('ffmpeg', args));
  await runFfmpeg(args);
}
