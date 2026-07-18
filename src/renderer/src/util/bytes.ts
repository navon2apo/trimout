export function cloneUint8Array(value: Uint8Array) {
  return new Uint8Array(value);
}

export function decodeText(value: Uint8Array) {
  return new TextDecoder().decode(cloneUint8Array(value));
}
