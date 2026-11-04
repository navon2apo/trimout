/**
 * Quality presets + aspect-ratio re-encode pipeline.
 * Adds an FFmpeg pass after the lossless cut: H.264 + CRF, optionally with
 * an aspect-ratio change (9:16 / 16:9 / 1:1) using either center-crop or
 * black-bar padding.
 */
import { runFfmpeg, getFfCommandLine } from '../ffmpeg';
import type { ZoomAnchor, ZoomRect } from '../types';
import { buildZoompanFilter, toClipRelative, type ZoomEase } from './zoomAnchors';

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

/**
 * FFmpeg crop filter for a normalized zoom frame. Width/height/offsets are rounded
 * down to even numbers because yuv420p H.264 cannot encode odd dimensions.
 */
export function buildZoomCropFilter(zoomRect: ZoomRect): string {
  const even = (expr: string) => `trunc((${expr})/2)*2`;
  return `crop=${even(`iw*${zoomRect.w.toFixed(5)}`)}:${even(`ih*${zoomRect.h.toFixed(5)}`)}:${even(`iw*${zoomRect.x.toFixed(5)}`)}:${even(`ih*${zoomRect.y.toFixed(5)}`)}`;
}

export interface CompressOptions {
  inPath: string;
  outPath: string;
  preset: Exclude<QualityPreset, 'lossless'>;
  /** Output aspect ratio. 'original' = no geometry change. Default: 'original'. */
  aspectRatio?: AspectRatio;
  /** How to handle the aspect mismatch. 'crop' loses content, 'pad' adds black bars. */
  fitMode?: FitMode;
  /** Fixed zoom (one anchor): the picture is cropped to it before the aspect step. */
  zoomRect?: ZoomRect | undefined;
  /**
   * Moving zoom (two or more anchors): the clip is re-rendered straight from the source video at
   * its exact start, so anchor times line up with the frames. `inPath` is not used then.
   */
  zoomMotion?: {
    sourcePath: string,
    start: number,
    end: number,
    anchors: ZoomAnchor[],
    width: number,
    height: number,
    fps: number,
    ease?: ZoomEase | undefined,
  } | undefined;
  appendCommandLog?: (args: string[]) => void;
}

/**
 * Compress a single lossless-cut MP4 with H.264 + CRF, optionally zooming into a region
 * and/or changing aspect ratio. Audio re-encoded to AAC 128k for WhatsApp/mobile compatibility.
 */
export async function compressClip({
  inPath,
  outPath,
  preset,
  aspectRatio = 'original',
  fitMode = 'crop',
  zoomRect,
  zoomMotion,
  appendCommandLog,
}: CompressOptions): Promise<void> {
  const { crf, preset: ffPreset } = QUALITY_PRESETS[preset];
  // Zoom first (what the user framed), then the output aspect on top of it
  const zoomFilter = zoomMotion != null
    ? buildZoompanFilter({ anchors: toClipRelative(zoomMotion.anchors, zoomMotion.start), width: zoomMotion.width, height: zoomMotion.height, fps: zoomMotion.fps, ease: zoomMotion.ease })
    : (zoomRect ? buildZoomCropFilter(zoomRect) : null);
  const vf = [zoomFilter, buildAspectFilter(aspectRatio, fitMode)]
    .filter((f): f is string => f != null)
    .join(',') || null;

  const args = [
    '-hide_banner', '-y',
    ...(zoomMotion != null
      ? ['-ss', zoomMotion.start.toFixed(3), '-i', zoomMotion.sourcePath, '-t', (zoomMotion.end - zoomMotion.start).toFixed(3)]
      : ['-i', inPath]),
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
