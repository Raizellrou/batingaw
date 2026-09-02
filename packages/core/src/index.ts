export { CURRENT_VERSION, Hazard, Severity } from "./types.js";
export type { AlertBody, AlertPacket } from "./types.js";

export { BODY_LENGTH, encodeBody, decodeBody, validateBody } from "./codec.js";

export { ALERT_HASH_LENGTH, alertHash, toHex } from "./hash.js";

export { SIGNATURE_LENGTH, signBody, verifyBody } from "./sign.js";

export { PACKET_LENGTH, encodePacket, decodePacket, verifyPacket } from "./packet.js";

export { ReplayGuard } from "./replay.js";
export type { ReplayDecision, ReplayGuardOptions } from "./replay.js";
