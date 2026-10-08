"""
Streams synthetic sensor captures to a running backend, like a fleet of live nodes.

Every tick, a few random Chennai nodes upload a raw capture (pre-trigger noise plus
1-3 beam crossings) to /api/ingest/waveform, so the full server pipeline runs.

Usage (from backend/, with the API running):
    python -m scripts.live_demo --interval 8
    python -m scripts.live_demo --api-url http://127.0.0.1:8000 --iterations 5
"""
import argparse
import time
import numpy as np
import requests

from scripts.chennai_nodes import CHENNAI_NODES, node_registration, pick_species
from scripts.mock_sensor import generate_capture

SAMPLE_RATE = 16000

def register_nodes(api_url: str):
    """Registers every demo node; nodes that already exist are left as they are."""
    for node in CHENNAI_NODES:
        response = requests.post(f"{api_url}/api/nodes/", json=node_registration(node), timeout=10)
        if response.status_code not in (201, 409):
            response.raise_for_status()

def send_capture(api_url: str, node: dict, rng) -> dict:
    n_events = int(rng.integers(1, 4))
    species = pick_species(node, rng, n_events)
    capture, _ = generate_capture(species, duration_sec=0.6 * n_events + 0.4, rng=rng)
    response = requests.post(f"{api_url}/api/ingest/waveform", json={
        "node_id": node["id"],
        "sample_rate": SAMPLE_RATE,
        "samples": np.round(capture, 5).tolist(),
    }, timeout=30)
    response.raise_for_status()
    return {"sent": species, "result": response.json()}

def main():
    parser = argparse.ArgumentParser(description="Send live synthetic telemetry to the BuzzMap backend.")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    parser.add_argument("--interval", type=float, default=8.0, help="seconds between ticks")
    parser.add_argument("--nodes-per-tick", type=int, default=3)
    parser.add_argument("--iterations", type=int, default=0, help="number of ticks; 0 runs until Ctrl+C")
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()

    api_url = args.api_url.rstrip("/")
    rng = np.random.default_rng(args.seed)
    register_nodes(api_url)
    print(f"Streaming to {api_url} every {args.interval}s (Ctrl+C to stop)")

    tick = 0
    try:
        while args.iterations == 0 or tick < args.iterations:
            tick += 1
            chosen = rng.choice(len(CHENNAI_NODES), size=min(args.nodes_per_tick, len(CHENNAI_NODES)), replace=False)
            for index in chosen:
                node = CHENNAI_NODES[index]
                try:
                    outcome = send_capture(api_url, node, rng)
                except requests.RequestException as error:
                    print(f"[tick {tick}] {node['id']}: upload failed ({error})")
                    continue
                labels = [d["species_class"] for d in outcome["result"]["detections"]]
                print(f"[tick {tick}] {node['id']:<24} sent {outcome['sent']} -> classified {labels}")
            if args.iterations == 0 or tick < args.iterations:
                time.sleep(args.interval)
    except KeyboardInterrupt:
        print("Stopped.")

if __name__ == "__main__":
    main()
