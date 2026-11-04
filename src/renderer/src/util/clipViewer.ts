// Indexes (into the full clip list) of the clips the viewer can play.
// Markers without an end are skipped; favoritesOnly narrows to starred clips.
export function getViewerClipIndexes(clips: { end?: number | undefined, isFavorite?: boolean | undefined }[], favoritesOnly: boolean): number[] {
  return clips.flatMap((clip, i) => (clip.end != null && (!favoritesOnly || clip.isFavorite) ? [i] : []));
}

// What the viewer does on each time update while a clip plays.
export function getClipViewerStep({ time, clip, autoAdvance, hasNext }: {
  time: number,
  clip: { start: number, end: number },
  autoAdvance: boolean,
  hasNext: boolean,
}): 'continue' | 'advance' | 'stop' {
  if (time < clip.end) return 'continue';
  return autoAdvance && hasNext ? 'advance' : 'stop';
}
