const invalidWindowsFileNameCharacters = /[<>:"/\\|?*]/g;

export default function createClipFileLabel(parts: (string | number | null | undefined)[]): string {
  return [...parts
    .filter((part) => part != null && String(part).trim().length > 0)
    .join(' ')]
    .filter((character) => character.codePointAt(0)! >= 32)
    .join('')
    .replaceAll(invalidWindowsFileNameCharacters, ' - ')
    .replaceAll(/\s+/g, ' ')
    .replaceAll(/(?:\s+-\s+)+/g, ' - ')
    .replaceAll(/[. ]+$/g, '')
    .trim()
    .slice(0, 120);
}
