/** Moves one item to a new place in the list (both are positions in the list). Returns a new list. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const target = Math.min(Math.max(to, 0), list.length - 1);
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item!);
  return next;
}

/** The segments in the given order (by segId). Segments that are not in the list keep their order, after the others. */
export function reorderByIds<T extends { segId: string }>(segments: T[], idsInOrder: string[]): T[] {
  const byId = new Map(segments.map((segment) => [segment.segId, segment]));
  const wanted = new Set(idsInOrder);
  const ordered = idsInOrder.flatMap((id) => byId.get(id) ?? []);
  return [...ordered, ...segments.filter((segment) => !wanted.has(segment.segId))];
}

/** The number each clip gets in the export: 1, 2, 3 ... for the clips that are in it, in order; none for the ones left out */
export function exportNumbers(clips: { included: boolean }[]): (number | null)[] {
  let next = 0;
  return clips.map((clip) => {
    if (!clip.included) return null;
    next += 1;
    return next;
  });
}
