/**
 * PRD §5.4 — replay, duplicate, and staleness rules.
 *
 * A multi-hop mesh delivers the *same* legitimate alert to a node more than
 * once, by different paths. Duplicate suppression (has this exact packet
 * been seen recently?) and replay defence (is this issuer's sequence number
 * moving backward?) are deliberately separate mechanisms — conflating them
 * either breaks propagation (an old-but-legitimate rebroadcast gets treated
 * as an attack) or opens a replay hole (a resent old packet gets waved
 * through as "just a duplicate").
 *
 * Clock trust is deliberately excluded: field nodes have no NTP and drift is
 * guaranteed, so `issuedAt` is never used to accept or reject a packet here.
 * Sequence number is the sole ordering defence — see PRD §5.4.
 */

export type ReplayDecision =
  | "accept"
  | "duplicate" // same alertHash seen recently — normal mesh rebroadcast, not an attack
  | "replay"; // sequence not newer than the last one accepted from this issuer

export interface ReplayGuardOptions {
  /** How long a seen `alertHash` is remembered for dedupe. Default 10 minutes. */
  seenHashTtlMs?: number;
}

interface SeenEntry {
  expiresAt: number;
}

const DEFAULT_SEEN_HASH_TTL_MS = 10 * 60 * 1000;

export class ReplayGuard {
  private readonly lastSeq = new Map<number, number>(); // issuerIndex -> highest sequence accepted
  private readonly seenHashes = new Map<string, SeenEntry>(); // alertHash hex -> expiry
  private readonly seenHashTtlMs: number;

  constructor(options: ReplayGuardOptions = {}) {
    this.seenHashTtlMs = options.seenHashTtlMs ?? DEFAULT_SEEN_HASH_TTL_MS;
  }

  /**
   * Evaluates one already-signature-verified packet and, if accepted,
   * records it — so a relay's whole receive path is
   * `if (guard.evaluate(...) !== "accept") drop(); else rebroadcast();`.
   * Sequence checks and dedupe both key off `issuerIndex`, not the public
   * key itself, matching the wire format's 1-byte issuer reference.
   */
  evaluate(alertHashHex: string, issuerIndex: number, sequence: number, now = Date.now()): ReplayDecision {
    this.pruneExpired(now);

    if (this.seenHashes.has(alertHashHex)) {
      return "duplicate";
    }

    const highestSeen = this.lastSeq.get(issuerIndex) ?? -1;
    if (sequence <= highestSeen) {
      return "replay";
    }

    this.seenHashes.set(alertHashHex, { expiresAt: now + this.seenHashTtlMs });
    this.lastSeq.set(issuerIndex, sequence);
    return "accept";
  }

  private pruneExpired(now: number): void {
    for (const [hash, entry] of this.seenHashes) {
      if (entry.expiresAt <= now) this.seenHashes.delete(hash);
    }
  }
}
