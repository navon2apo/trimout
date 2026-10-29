// Shortest clip a trim handle may leave behind, so start and end never cross.
export const MIN_CLIP_SECONDS = 0.5;

export function trimClipEdge(
  clip: { start: number, end: number },
  edge: 'start' | 'end',
  time: number,
  duration: number,
): { start: number, end: number } {
  if (edge === 'start') {
    return { start: Math.min(Math.max(time, 0), clip.end - MIN_CLIP_SECONDS), end: clip.end };
  }
  return { start: clip.start, end: Math.max(Math.min(time, duration), clip.start + MIN_CLIP_SECONDS) };
}

// "Play all" walks the clip list in order and skips markers that have no end yet.
export function getNextPlayableClipIndex(clips: { start: number, end?: number | undefined }[], afterIndex: number): number | undefined {
  for (let i = afterIndex + 1; i < clips.length; i += 1) {
    if (clips[i]!.end != null) return i;
  }
  return undefined;
}

// The engine keeps an automatic whole-video segment until the first clip is marked.
// It replaces itself on the first clip, so filtering it never shifts clip indexes.
export function getUserClips<T extends { initial?: boolean | undefined }>(segments: T[]): T[] {
  return segments.filter((segment) => !segment.initial);
}
