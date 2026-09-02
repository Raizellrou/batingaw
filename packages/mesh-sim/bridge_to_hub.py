"""
The real Track A -> Track B join: observes what arrives at the hub node's
own client interface -- exactly what a real hub app would see if it could
speak Meshtastic directly -- and POSTs it to the actual packages/hub
server. This is PRD Section 5.5's wire boundary made real, not simulated:
the bytes that cross into /alert are byte-for-byte what the sensor signed.

Subscribes to the plain "meshtastic.receive" topic, not
"meshtastic.receive.simulator" -- that distinction matters. The
'.simulator' topic (used by InteractiveSim itself, and by
run_relay_test.py's inner_payload helper) is the orchestrator's internal
radio-relay bookkeeping, where payloads arrive double-wrapped in a
SIMULATOR_APP envelope. Plain "meshtastic.receive" is the normal decoded
client-API event -- what a real connected app sees -- and its payload is
already the raw application bytes, no unwrapping needed.

Requires packages/hub running separately (pnpm --filter @ligtas/hub start,
or node dist/index.js after building) and reachable at HUB_URL.

Run with Meshtasticator's own venv Python:
  <meshtasticator>/.venv/Scripts/python.exe bridge_to_hub.py
"""
import os
import time

import requests
from pubsub import pub

import driver
from driver import emit_alert

HUB_NODE_ID = 3  # sensor=0, relay A=1, relay B=2, hub=3 -- see topology.yaml
HUB_URL = os.environ.get("LIGTAS_HUB_URL", "http://localhost:3001")
# Must be the secret for the public key in packages/hub/config/issuers.json --
# emit_alert with no --issuer-secret signs with a fresh random keypair the
# hub has never heard of, which is a "rejected_signature" every time, not a
# "genuine" alert. Never hardcode this; the hub's demo issuer secret is
# generated per session and passed in, never committed.
ISSUER_SECRET = os.environ["LIGTAS_DEMO_ISSUER_SECRET"]

posted_hashes = set()


def on_receive(packet, interface):
    hub_iface = sim.get_node_iface_by_id(HUB_NODE_ID)
    if interface is not hub_iface:
        return
    decoded = packet.get("decoded", {})
    if decoded.get("portnum") != "PRIVATE_APP":
        return
    payload: bytes = decoded.get("payload")
    if payload is None or len(payload) != 84:
        return

    packet_hex = payload.hex()
    if packet_hex in posted_hashes:
        return  # already bridged this exact packet -- avoid a duplicate POST for a duplicate radio reception
    posted_hashes.add(packet_hex)

    print(f"\n[bridge] hub node received {len(payload)} bytes -- POSTing to {HUB_URL}/alert")
    try:
        resp = requests.post(f"{HUB_URL}/alert", json={"packetHex": packet_hex}, timeout=5)
        print(f"[bridge] hub responded {resp.status_code}: {resp.json()}")
    except requests.RequestException as e:
        print(f"[bridge] POST failed: {e} -- is packages/hub running at {HUB_URL}?")


driver.reset_container()
driver.install_topology()
sim = driver.build_sim()
pub.subscribe(on_receive, "meshtastic.receive")

try:
    print("Waiting for node interfaces to settle and role config to apply...")
    time.sleep(15)

    print(f"\nBridge live. Watching hub node {HUB_NODE_ID}'s client interface, POSTing to {HUB_URL}.")

    alert = emit_alert(mode="genuine", sequence=1, issuer_secret=ISSUER_SECRET)
    print(f"Broadcasting genuine alert (seq=1) from node 0...")
    sim.get_node_iface_by_id(0).sendData(
        bytes.fromhex(alert["packetHex"]), destinationId="^all", portNum=driver.PRIVATE_APP_PORT, wantAck=False
    )
    time.sleep(10)

    forged = emit_alert(mode="forged", sequence=2, issuer_secret=ISSUER_SECRET)
    print(f"\nBroadcasting FORGED alert (seq=2) from node 0...")
    sim.get_node_iface_by_id(0).sendData(
        bytes.fromhex(forged["packetHex"]), destinationId="^all", portNum=driver.PRIVATE_APP_PORT, wantAck=False
    )
    time.sleep(10)

    print(f"\n[bridge] fetching {HUB_URL}/alerts to confirm what actually landed...")
    bundle = requests.get(f"{HUB_URL}/alerts", timeout=5).json()
    print(f"[bridge] hub reports {len(bundle['alerts'])} accepted alert(s) in its bundle.")

finally:
    print("\nShutting down...")
    sim.close_nodes()
