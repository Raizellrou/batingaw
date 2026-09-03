import type Database from "better-sqlite3";
import type { Keypair } from "@stellar/stellar-sdk/base";
import { bytesFromHex } from "@ligtas/core";
import { getTransactionStatus, prepareAnchorTransaction } from "@ligtas/stellar";

export interface DrainResult {
  alertHash: string;
  outcome: "confirmed" | "failed";
}

/**
 * Drains the outbox to Stellar Testnet (PRD Section 6.2). Meant to be
 * called whenever connectivity is present -- on an interval, or on demand
 * via POST /drain -- not run continuously.
 *
 * Reconciles anything left `anchor_status = 'submitted'` by an interrupted
 * previous run *before* picking up new `pending` work, so a crash never
 * loses track of a transaction that may have actually landed. This is the
 * one property `prepareAnchorTransaction`'s two-phase split exists for:
 * the transaction hash is known and persisted before this function ever
 * awaits the network.
 *
 * Not yet built here: claimable-balance payouts (Stage 5). This worker
 * only advances `anchor_status`; `payout_status` is untouched.
 */
export async function drainOutbox(db: Database.Database, issuer: Keypair): Promise<DrainResult[]> {
  const results: DrainResult[] = [];

  const stuck = db
    .prepare<[], { alert_hash: string; anchor_tx: string }>(
      "SELECT alert_hash, anchor_tx FROM alerts WHERE anchor_status = 'submitted' ORDER BY received_at ASC",
    )
    .all();
  for (const row of stuck) {
    results.push(await reconcileOne(db, issuer, row.alert_hash, row.anchor_tx));
  }

  const pending = db
    .prepare<[], { alert_hash: string }>(
      "SELECT alert_hash FROM alerts WHERE anchor_status = 'pending' ORDER BY received_at ASC",
    )
    .all();
  for (const row of pending) {
    results.push(await submitOne(db, issuer, row.alert_hash));
  }

  return results;
}

async function submitOne(db: Database.Database, issuer: Keypair, alertHash: string): Promise<DrainResult> {
  const prepared = await prepareAnchorTransaction(issuer, bytesFromHex(alertHash));

  // Recorded *before* awaiting confirmation -- see module docstring.
  db.prepare("UPDATE alerts SET anchor_status = 'submitted', anchor_tx = ? WHERE alert_hash = ?").run(
    prepared.transactionHash,
    alertHash,
  );

  try {
    const { successful } = await prepared.submit();
    const outcome: DrainResult["outcome"] = successful ? "confirmed" : "failed";
    db.prepare("UPDATE alerts SET anchor_status = ? WHERE alert_hash = ?").run(outcome, alertHash);
    return { alertHash, outcome };
  } catch (err) {
    // Ambiguous: the transaction may or may not have reached the network.
    // Leave anchor_status = 'submitted' (already set above) so the next
    // drain run reconciles it against Horizon directly, rather than
    // guessing here and risking either a lost anchor or a duplicate one.
    db.prepare("UPDATE alerts SET attempts = attempts + 1, last_error = ? WHERE alert_hash = ?").run(
      (err as Error).message,
      alertHash,
    );
    return { alertHash, outcome: "failed" };
  }
}

async function reconcileOne(
  db: Database.Database,
  issuer: Keypair,
  alertHash: string,
  transactionHash: string,
): Promise<DrainResult> {
  const status = await getTransactionStatus(transactionHash);
  if (status === "not_found") {
    // The previous run recorded a hash but the transaction never reached
    // the network (crashed before or during submit) -- safe to build and
    // submit a fresh one. Its timebounds would have expired by now anyway.
    return submitOne(db, issuer, alertHash);
  }
  db.prepare("UPDATE alerts SET anchor_status = ? WHERE alert_hash = ?").run(status, alertHash);
  return { alertHash, outcome: status };
}
