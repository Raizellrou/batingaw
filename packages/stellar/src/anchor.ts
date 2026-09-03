import { Asset, BASE_FEE, Keypair, Memo, Operation, TransactionBuilder } from "@stellar/stellar-sdk";
import { horizonClient, TESTNET_NETWORK_PASSPHRASE } from "./client.js";

const ALERT_HASH_LENGTH = 32;
/** Smallest possible payment (1 stroop) -- the anchor is the memo, not the transfer. */
const ANCHOR_PAYMENT_AMOUNT = "0.0000001";

export interface AnchorResult {
  transactionHash: string;
  ledger: number;
  successful: boolean;
}

/**
 * Anchors a 32-byte alert hash to Stellar Testnet: a minimal payment from
 * `account` to itself carrying `MEMO_HASH = alertHash` (PRD Section 7).
 * Stellar Classic only -- no Soroban, per CLAUDE.md's hard constraint.
 *
 * `alertHash` is meant to be `packages/core`'s own `alertHash()` output
 * fed straight in -- no re-encoding, so the on-chain memo is exactly the
 * hash a verifier would independently recompute.
 */
export async function anchorAlertHash(account: Keypair, alertHash: Uint8Array): Promise<AnchorResult> {
  if (alertHash.length !== ALERT_HASH_LENGTH) {
    throw new RangeError(`alertHash must be ${ALERT_HASH_LENGTH} bytes, got ${alertHash.length}`);
  }

  const server = horizonClient();
  const sourceAccount = await server.loadAccount(account.publicKey());

  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: account.publicKey(),
        asset: Asset.native(),
        amount: ANCHOR_PAYMENT_AMOUNT,
      }),
    )
    .addMemo(Memo.hash(alertHash))
    .setTimeout(30)
    .build();

  transaction.sign(account);

  const response = await server.submitTransaction(transaction);
  return {
    transactionHash: response.hash,
    ledger: response.ledger,
    successful: response.successful,
  };
}
