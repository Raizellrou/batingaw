const LAYERS = [
  {
    n: 'L1',
    title: 'Sensor node by the river',
    body: 'Reads the water level, debounces it against three severity thresholds, then builds a 20-byte alert body and signs it with its Stellar keypair. 84 bytes go out over LoRa: 20 body + 64 signature.',
    proof: 'Simulated in Wokwi (ESP32, Arduino C++). Signs with real Ed25519 — cross-checked byte-for-byte against @stellar/stellar-sdk.',
  },
  {
    n: 'L2',
    title: 'Relay nodes on rooftops',
    body: 'Plain LoRa repeaters. They forward the packet without understanding it — stock firmware has no idea what a LIGTAS alert is, which is exactly why the signature has to travel with the bytes.',
    proof: 'Proven against a real Meshtasticator mesh: multi-hop delivery, a relay killed mid-run with the kill independently verified, forged and replayed packets propagating but rejected at the far end.',
  },
  {
    n: 'L3',
    title: 'Hub at the barangay hall',
    body: 'Verifies the signature against a cached list of authorised issuers, checks the sequence number against replays, fires the siren, and serves this page over its own WiFi. No internet needed for any of that.',
    proof: 'Node + Express + SQLite. Verified live end to end: a genuine alert accepted, a forged one rejected on signature, a replayed one rejected on sequence.',
  },
  {
    n: 'L4',
    title: 'Reconnection layer',
    body: "Once connectivity returns, a drain worker anchors each alert's 32-byte hash to Stellar as MEMO_HASH — a timestamped record no party to a later dispute controls.",
    proof: 'Ran for real on Stellar Testnet. The on-chain memo was fetched back from Horizon and matched the locally recomputed hash exactly.',
  },
  {
    n: 'L5',
    title: 'Parametric payout',
    body: 'Pre-funded claimable balances released to registered households in the affected puroks, by severity tier, with no human adjudication step.',
    proof: 'Not built yet — Stage 5. The household registry it needs does not exist yet either.',
  },
]

const ANCHOR_TX = 'eec7aff9e83a7de4498c09a2f48b0cf0d7a552fafd37f255a794103095a4216d'

export function HowItWorksView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">How it works</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          A flood warning has to travel when the internet is already gone. LIGTAS sends it as a signed 84-byte packet
          over a LoRa radio mesh — relay to relay, no towers, no signal — and every node along the way can prove the
          warning is genuine without asking anyone.
        </p>
      </div>

      <ol className="space-y-3">
        {LAYERS.map((layer) => (
          <li key={layer.n} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-xs font-bold text-sky-400">{layer.n}</span>
              <h3 className="text-sm font-semibold text-slate-100">{layer.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{layer.body}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{layer.proof}</p>
          </li>
        ))}
      </ol>

      <section className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-4">
        <h3 className="text-sm font-semibold text-amber-200">What this page actually proves</h3>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-amber-100/80">
          <li>
            <strong className="text-amber-100">Real:</strong> the packet format, the Ed25519 signing, the signature
            check, and the replay guard. All of it runs in your browser, in the same code the hub runs.
          </li>
          <li>
            <strong className="text-amber-100">Not real here:</strong> radio propagation. There is no LoRa mesh in a
            browser tab. The mesh is proven separately against a real Meshtasticator simulation, and no amount of
            simulation proves RF behaviour through actual terrain — that needs a field test.
          </li>
          <li>
            <strong className="text-amber-100">Also real, but elsewhere:</strong> the Stellar anchor. A hash from the
            captured run is on Testnet now.
          </li>
        </ul>
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${ANCHOR_TX}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs text-amber-300 underline hover:text-amber-100"
        >
          View the anchor transaction on Stellar Expert →
        </a>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="text-sm font-semibold text-slate-200">Try it yourself</h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-400">
          <li>
            Open <strong className="text-slate-200">Tester</strong> and drag the river gauge past 200 cm.
          </li>
          <li>
            Send a <strong className="text-slate-200">genuine</strong> alert, then switch to{' '}
            <strong className="text-slate-200">Resident</strong>, pick purok 3 or 4, and watch the instruction appear.
          </li>
          <li>
            Go back and send a <strong className="text-slate-200">forged</strong> one. It is a real signature — from the
            wrong key. Watch the resident view reject it without being told to.
          </li>
          <li>
            Send a <strong className="text-slate-200">replay</strong>, or rebroadcast an old packet's exact bytes from
            the log, and watch the sequence check catch it.
          </li>
          <li>
            Pick puroks that don't include yours, and the resident view says so explicitly rather than staying silent.
          </li>
        </ol>
      </section>
    </div>
  )
}
