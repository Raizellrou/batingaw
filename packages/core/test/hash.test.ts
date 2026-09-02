import { describe, expect, it } from "vitest";
import { encodeBody } from "../src/codec.js";
import { ALERT_HASH_LENGTH, alertHash, toHex } from "../src/hash.js";
import { CURRENT_VERSION, Hazard, Severity, type AlertBody } from "../src/types.js";

const body: AlertBody = {
  version: CURRENT_VERSION,
  hazard: Hazard.STORM_SURGE,
  severity: Severity.TIER_2,
  issuerIndex: 1,
  purokBitmap: 0b0110,
  issuedAt: 1_893_456_000,
  sequence: 3,
  waterLevelCm: 150,
};

describe("alertHash", () => {
  it("is 32 bytes — exactly a Stellar MEMO_HASH", async () => {
    const hash = await alertHash(encodeBody(body));
    expect(hash.length).toBe(ALERT_HASH_LENGTH);
  });

  it("is deterministic for the same body", async () => {
    const bodyBytes = encodeBody(body);
    const a = await alertHash(bodyBytes);
    const b = await alertHash(bodyBytes);
    expect(toHex(a)).toBe(toHex(b));
  });

  it("changes if a single body byte changes", async () => {
    const bodyBytes = encodeBody(body);
    const tampered = bodyBytes.slice();
    tampered[12] ^= 0x01; // flip a bit in sequence

    const original = toHex(await alertHash(bodyBytes));
    const changed = toHex(await alertHash(tampered));

    expect(changed).not.toBe(original);
  });
});
