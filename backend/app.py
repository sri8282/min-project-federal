"""
app.py — Flask REST API
========================
Endpoints:
  GET  /health            — health check
  POST /upload-dataset    — accept CSV file, validate, store
  POST /run-simulation    — start simulation in background thread
  GET  /results           — return completed simulation results
  GET  /logs              — return streaming log lines
  GET  /status            — running | completed | idle
"""

import os
import threading
import logging
from typing import Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
import simulation as sim_module

# ─── Logging ──────────────────────────────────────────────────────────────── #
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ─── App Setup ────────────────────────────────────────────────────────────── #
app = Flask(__name__)
CORS(app, origins="*")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

_uploaded_dataset_path: Optional[str] = None
_simulation_thread: Optional[threading.Thread] = None
_simulation_error: Optional[str] = None
_simulation_status: str = "idle"   # idle | running | completed | error


# ─── Helpers ──────────────────────────────────────────────────────────────── #

def _validate_csv(filepath: str) -> dict:
    """Return exact CSV metadata: num rows, num cols, column names."""
    import pandas as pd
    df = pd.read_csv(filepath)          # read full file — exact row count
    return {
        "columns": list(df.columns),
        "num_columns": len(df.columns),
        "preview_rows": len(df),        # exact, not approximate
    }


# ─── Routes ───────────────────────────────────────────────────────────────── #

@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "trust-fl-backend"})


@app.post("/upload-dataset")
def upload_dataset():
    global _uploaded_dataset_path

    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are accepted"}), 400

    # Save file
    save_path = os.path.join(UPLOAD_DIR, "dataset.csv")
    file.save(save_path)
    _uploaded_dataset_path = save_path
    logger.info(f"Dataset saved to {save_path}")

    try:
        meta = _validate_csv(save_path)
    except Exception as exc:
        return jsonify({"error": f"CSV parse error: {str(exc)}"}), 422

    return jsonify({
        "success": True,
        "filename": file.filename,
        "columns": meta["columns"],
        "num_columns": meta["num_columns"],
        "approximate_rows": meta["preview_rows"],
        "label_column": meta["columns"][-1],
        "message": f"Dataset uploaded. {meta['num_columns']} features, ~{meta['preview_rows']} rows.",
    })


@app.post("/run-simulation")
def run_simulation():
    global _simulation_thread, _simulation_error, _simulation_status

    if _uploaded_dataset_path is None:
        return jsonify({"error": "No dataset uploaded yet. POST /upload-dataset first."}), 400

    if _simulation_status == "running":
        return jsonify({"error": "Simulation already running."}), 409

    body = request.get_json(silent=True) or {}
    num_clients  = int(body.get("num_clients",  5))
    num_malicious = int(body.get("num_malicious", 1))
    num_rounds   = int(body.get("num_rounds",   5))

    if num_malicious >= num_clients:
        return jsonify({"error": "num_malicious must be less than num_clients"}), 400

    _simulation_error = None
    _simulation_status = "running"

    def _run():
        global _simulation_status, _simulation_error
        try:
            sim_module.run_simulation(
                dataset_path=_uploaded_dataset_path,
                num_clients=num_clients,
                num_malicious=num_malicious,
                num_rounds=num_rounds,
            )
            _simulation_status = "completed"
        except Exception as exc:
            _simulation_error = str(exc)
            _simulation_status = "error"
            logger.exception("Background simulation failed")

    _simulation_thread = threading.Thread(target=_run, daemon=True)
    _simulation_thread.start()

    return jsonify({
        "message": "Simulation started",
        "num_clients": num_clients,
        "num_malicious": num_malicious,
        "num_rounds": num_rounds,
    })


@app.get("/status")
def status():
    return jsonify({
        "status": _simulation_status,
        "error": _simulation_error,
        "log_count": len(sim_module.get_logs()),
    })


@app.get("/results")
def results():
    if _simulation_status not in ("completed",):
        return jsonify({"error": "Simulation not yet completed.", "status": _simulation_status}), 404

    data = sim_module.get_results()
    if not data:
        return jsonify({"error": "No results available."}), 404

    return jsonify(data)


@app.get("/logs")
def logs():
    all_logs = sim_module.get_logs()
    offset = int(request.args.get("offset", 0))
    return jsonify({
        "logs": all_logs[offset:],
        "total": len(all_logs),
        "status": _simulation_status,
    })


# ─── Entry Point ──────────────────────────────────────────────────────────── #

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005, debug=False)
