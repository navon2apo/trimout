import { describe, expect, it } from 'vitest';

import { cloneUint8Array, decodeText } from './bytes';

describe('cross-context byte handling', () => {
  it('copies resizable byte views before browser APIs consume them', () => {
    const buffer = new ArrayBuffer(4, { maxByteLength: 16 });
    const source = new Uint8Array(buffer);
    source.set([75, 73, 67, 75]);

    const cloned = cloneUint8Array(source);

    expect(cloned).not.toBe(source);
    expect(cloned.buffer).not.toBe(buffer);
    expect(decodeText(source)).toBe('KICK');
  });
});
