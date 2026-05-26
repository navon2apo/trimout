/**
 * Quality presets — simple H.264 re-encode after the lossless cut.
 * Produces a parallel "_compressed.mp4" file beside each segment when active.
 */
import { runFfmpeg, getFfCommandLine } from '../ffmpeg';

export type QualityPreset = 'lossless' | 'high' | 'balanced' | 'small';

export const QUALITY_PRESETS: Record<Exclude<QualityPreset, 'lossless'>, { crf: number; preset: string; label: string; descriptionHe: string }> = {
  high: { crf: 18, preset: 'slow', label: 'איכות גבוהה', descriptionHe: 'איכות מקסימלית, קובץ גדול יותר' },
  balanced: { crf: 23, preset: 'medium', label: 'מאוזן', descriptionHe: 'איזון בין איכות לגודל (מומלץ)' },
  small: { crf: 28, preset: 'medium', label: 'קובץ קטן', descriptionHe: 'מהיר ל-WhatsApp ומובייל' },
};

export interface CompressOptions {
  inPath: string;
  outPath: string;
  preset: Exclude<QualityPreset, 'lossless'>;
  appendCommandLog?: (args: string[]) => void;
}

/**
 * Compress a single lossless-cut MP4 with H.264 + CRF.
 * Audio re-encoded to AAC 128k for WhatsApp/mobile compatibility.
 */
export async function compressClip({ inPath, outPath, preset, appendCommandLog }: CompressOptions): Promise<void> {
  const { crf, preset: ffPreset } = QUALITY_PRESETS[preset];

  const args = [
    '-hide_banner', '-y',
    '-i', inPath,
    '-c:v', 'libx264',
    '-crf', String(crf),
    '-preset', ffPreset,
    '-pix_fmt', 'yuv420p', // broad compatibility
    '-movflags', '+faststart', // web/mobile streaming
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ac', '2',
    outPath,
  ];

  appendCommandLog?.(args);
  // logCli flag intentionally omitted — default
  console.log('[compressClip]', getFfCommandLine('ffmpeg', args));
  await runFfmpeg(args);
}
