import { describe, expect, it } from 'vitest';
import createClipFileLabel from './clipNaming';

describe('createClipFileLabel', () => {
  it('keeps display punctuation out of Windows file names', () => {
    expect(createClipFileLabel(['Alex Morgan', 'Dribble / 1v1', 1]))
      .toBe('Alex Morgan Dribble - 1v1 1');
  });

  it('collapses every reserved character without losing the useful label', () => {
    expect(createClipFileLabel(['Sam', String.raw`Pass: left\right?`, 2]))
      .toBe('Sam Pass - left - right - 2');
  });
});
