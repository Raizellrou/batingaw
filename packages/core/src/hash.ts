/** PRD §5.2 — 32-byte alert identity, doubles as the Stellar `MEMO_HASH` value. */
export const ALERT_HASH_LENGTH = 32;

/**
 * `alertHash = SHA-256(body)`. Uses Web Crypto (`crypto.subtle`) rather than
 * `node:crypto` so this module runs unmodified in the PWA as well as Node —
 * both expose the same `crypto.subtle.digest` global.
 */
export async function alertHash(body: Uint8Array): Promise<Uint8Array> {
  // TS 5.7 made TypedArrays generic over their buffer (ArrayBuffer |
  // SharedArrayBuffer), which no longer structurally matches lib.dom's
  // `BufferSource`. The cast is safe: every Uint8Array this module ever
  // sees is backed by a plain ArrayBuffer, never a SharedArrayBuffer.
  const digest = await crypto.subtle.digest("SHA-256", body as BufferSource);
  return new Uint8Array(digest);
}

/** Lowercase hex, used as the outbox primary key and mesh dedupe key. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Inverse of toHex. Used to decode a wire packet carried as hex -- see AlertBundleEntry. */
export function bytesFromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new RangeError(`hex string must have an even length, got ${hex.length}`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
