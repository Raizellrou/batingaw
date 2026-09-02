# @ligtas/mesh-sim

Python, not TypeScript — see [PRD §5.5](../../LIGTAS-PRD.md#55-carriage-over-the-mesh) for why. This package drives Meshtasticator's own orchestrator to inject real signed LIGTAS alert packets (built by `packages/core`) at a simulated sensor node and observe them hop across the mesh to the hub.

## What it proves

`run_relay_test.py` is the Track A proof, run against a live Meshtasticator instance:

1. A genuine signed alert reaches the hub through a relay
2. Killing that relay mid-run, the alert still reaches the hub through the redundant relay — and the killed relay is confirmed to have transmitted nothing, not just assumed dead
3. A forged alert (signed by an impostor key) propagates through the mesh exactly like a real one — stock Meshtastic firmware forwards any payload, it can't parse ours — but is rejected by `verify-alert.ts`, the same code the hub and PWA run
4. A replayed alert (the original packet, resent) is likewise forwarded by the mesh but rejected on the sequence check

Every accept/reject decision is made by `packages/core` (via the `emit-alert.ts` / `verify-alert.ts` CLI bridges), never reimplemented here. This package only ever moves bytes and orchestrates the simulator.

## Prerequisites

- Docker Desktop running
- [Meshtasticator](https://github.com/meshtastic/Meshtasticator) cloned as a sibling to this repo, with its own venv set up per its own README (`pip install -r requirements.txt`, plus `pip install docker`)
- `packages/core` compiled: `cd packages/core && ..\..\node_modules\.bin\tsc -p tsconfig.json`

## Running

Must run with **Meshtasticator's own venv Python**, since this script imports Meshtasticator's `lib.interactive` module directly rather than reimplementing radio propagation:

```bash
cd packages/mesh-sim
<path-to-meshtasticator>/.venv/Scripts/python.exe run_relay_test.py
```

Set `MESHTASTICATOR_PATH` if Meshtasticator isn't checked out as a sibling directory (`../../../Meshtasticator` relative to this file, i.e. next to this repo's own parent folder).

## Files

- `topology.yaml` — the 4-node layout (sensor, relay A, relay B, hub), with coordinates chosen against the simulator's real antenna-range model, not guessed. Comments explain a real Meshtastic collision-avoidance behavior (`numTxRelayCanceled`) hit and worked around while designing it.
- `driver.py` — shared setup: container lifecycle, topology installation, booting `InteractiveSim` via its Python API (not its interactive `(Cmd)` CLI, which needs a live terminal), reading a relay's process ID inside the container.
- `run_relay_test.py` — the full proof, described above.
- `debug_propagation.py` — a lighter diagnostic that sends one packet and dumps everything observed, including per-node relay stats. What was actually used to find both real bugs below.

## Two real bugs found building this — not hypothetical

Documented here because they're easy to reintroduce if this topology or driver logic changes.

1. **All nodes defaulted to `CLIENT_MUTE`.** With `isRouter` and `isRepeater` both false, a node's Meshtastic role is `CLIENT_MUTE`, which does not forward other nodes' traffic at all. Relay nodes need `isRepeater: true` explicitly.
2. **`kill` has no standalone binary in the `meshtastic/meshtasticd` image**, only a shell builtin. `container.exec_run(["kill", "-9", pid])` fails with exit 127 (`executable file not found`) — silently, if you don't check the exit code. Has to go through `exec_run(["sh", "-c", f"kill -9 {pid}"])` instead.

Both were caught by instrumenting a real run and reading the actual output, not by reasoning about what should happen.
