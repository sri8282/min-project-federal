"""
simulation.py — Federated Learning Round Orchestrator
======================================================
Orchestrates the full federated learning simulation:
  1. Load & preprocess the uploaded CSV dataset
  2. Split dataset into num_clients partitions (stratified)
  3. For each round:
     a. Distribute global model weights to all clients
     b. Each client trains locally
     c. Collect updates  
     d. Run FedAvg aggregation  → evaluate → record accuracy/loss
     e. Run Trust-Weighted aggregation → evaluate → record accuracy/loss
     f. Compute trust scores and contribution weights
  4. Return full results dict
"""

import os
import random
import numpy as np
import pandas as pd
import torch
import logging
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

from server import GlobalModel
from client import ClientTrainer
from aggregation import fedavg, trust_weighted_aggregation

logger = logging.getLogger(__name__)

# Module-level results store (updated during simulation)
_simulation_results: dict = {}
_simulation_logs: list = []
_simulation_running: bool = False


def log(msg: str):
    logger.info(msg)
    _simulation_logs.append(msg)


def get_logs() -> list:
    return list(_simulation_logs)


def get_results() -> dict:
    return dict(_simulation_results)


def is_running() -> bool:
    return _simulation_running


def load_and_preprocess(dataset_path: str) -> tuple:
    """
    Load CSV, encode categoricals, scale features, encode labels.

    Returns:
        (X: np.ndarray, y: np.ndarray, feature_names: list, num_classes: int)
    """
    log(f"Loading dataset from {dataset_path}")
    df = pd.read_csv(dataset_path)
    log(f"Dataset shape: {df.shape[0]} rows × {df.shape[1]} cols")

    # Drop columns with all NaN
    df = df.dropna(axis=1, how="all")
    df = df.dropna()
    log(f"After dropping NaN rows: {df.shape[0]} rows")

    # Identify label column (last column)
    label_col = df.columns[-1]
    log(f"Label column: '{label_col}'")

    X_df = df.drop(columns=[label_col]).copy()
    y_series = df[label_col]

    # Encode categorical features
    for col in X_df.select_dtypes(include=["object", "category"]).columns:
        le = LabelEncoder()
        X_df[col] = le.fit_transform(X_df[col].astype(str))

    # Encode labels
    le_y = LabelEncoder()
    y = le_y.fit_transform(y_series.astype(str))
    num_classes = len(le_y.classes_)
    log(f"Classes: {list(le_y.classes_)} → {num_classes} classes")

    X = X_df.values.astype(np.float32)

    # Scale features
    scaler = StandardScaler()
    X = scaler.fit_transform(X)

    log(f"Features: {X_df.shape[1]}, Samples: {X.shape[0]}")
    return X, y, list(X_df.columns), num_classes


def stratified_split(X: np.ndarray, y: np.ndarray, num_clients: int) -> list:
    """
    Split dataset into num_clients partitions preserving class distribution.
    Returns list of (X_part, y_part) tuples.
    """
    n = len(y)
    indices = np.arange(n)
    partitions = [[] for _ in range(num_clients)]

    # Group indices by class, then round-robin across clients
    classes = np.unique(y)
    for cls in classes:
        cls_idx = indices[y == cls]
        np.random.shuffle(cls_idx)
        for i, idx in enumerate(cls_idx):
            partitions[i % num_clients].append(idx)

    result = []
    for part in partitions:
        part = np.array(part)
        np.random.shuffle(part)
        result.append((X[part], y[part]))

    return result


def set_seeds(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False
    torch.use_deterministic_algorithms(True, warn_only=True)


def run_simulation(
    dataset_path: str,
    num_clients: int,
    num_malicious: int,
    num_rounds: int,
) -> dict:
    """
    Full federated learning simulation.

    Args:
        dataset_path:  path to uploaded CSV
        num_clients:   total number of clients
        num_malicious: number of malicious clients (subset of total)
        num_rounds:    number of communication rounds

    Returns:
        Full results dict (also stored in _simulation_results)
    """
    global _simulation_results, _simulation_logs, _simulation_running

    _simulation_logs = []
    _simulation_results = {}
    _simulation_running = True

    set_seeds(42)

    try:
        # ------------------------------------------------------------------ #
        # 1. Load & preprocess
        # ------------------------------------------------------------------ #
        X, y, feature_names, num_classes = load_and_preprocess(dataset_path)
        input_dim = X.shape[1]

        # Train / test split (20% held-out test set for server-side evaluation)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, stratify=y, random_state=42
        )
        log(
            f"Train: {X_train.shape[0]} samples, Test: {X_test.shape[0]} samples"
        )

        X_test_t = torch.tensor(X_test, dtype=torch.float32)
        y_test_t = torch.tensor(y_test, dtype=torch.long)

        # ------------------------------------------------------------------ #
        # 2. Partition training data across clients
        # ------------------------------------------------------------------ #
        partitions = stratified_split(X_train, y_train, num_clients)
        log(f"Dataset split into {num_clients} client partitions.")

        # Determine which clients are malicious (first num_malicious)
        malicious_ids = set(range(num_malicious))
        client_types = {}
        clients = []
        for i in range(num_clients):
            is_mal = i in malicious_ids
            cid = f"client_{i}"
            client_types[cid] = "malicious" if is_mal else "normal"
            X_c, y_c = partitions[i]
            trainer = ClientTrainer(
                client_id=cid,
                X=X_c,
                y=y_c,
                is_malicious=is_mal,
                attack_type="label_flip",
            )
            clients.append(trainer)
            log(
                f"  {cid}: {len(y_c)} samples | "
                f"{'MALICIOUS 🔴' if is_mal else 'NORMAL 🟢'}"
            )

        # ------------------------------------------------------------------ #
        # 3. Initialise two global models (one per strategy)
        # ------------------------------------------------------------------ #
        global_fedavg = GlobalModel(input_dim, num_classes)
        global_trust = GlobalModel(input_dim, num_classes)

        # Keep their weights identical at start
        init_weights = global_fedavg.get_weights()
        global_trust.set_weights(init_weights)

        fedavg_accuracies: list = []
        fedavg_losses: list = []
        trust_accuracies: list = []
        trust_losses: list = []
        all_trust_scores: dict = {}     # last round's trust scores
        all_contribution_weights: dict = {}
        all_anomaly_flags: dict = {}

        sample_counts = {f"client_{i}": len(partitions[i][1]) for i in range(num_clients)}

        # ------------------------------------------------------------------ #
        # 4. Federated rounds
        # ------------------------------------------------------------------ #
        for round_num in range(1, num_rounds + 1):
            log(f"\n{'='*50}")
            log(f"ROUND {round_num}/{num_rounds}")
            log(f"{'='*50}")

            # --- Collect local updates (share the SAME weights to both strategies) ---
            fa_global_w = global_fedavg.get_weights()
            tr_global_w = global_trust.get_weights()

            fa_updates: dict = {}
            tr_updates: dict = {}

            for client in clients:
                cid = client.client_id
                # Clients train on FedAvg branch weights
                fa_w, fa_loss = client.train(fa_global_w, input_dim, num_classes)
                fa_updates[cid] = fa_w

                # Clients also train on Trust branch weights
                tr_w, _ = client.train(tr_global_w, input_dim, num_classes)
                tr_updates[cid] = tr_w

                log(
                    f"  [{client_types[cid].upper()}] {cid}: "
                    f"train loss={fa_loss[-1]:.4f}"
                )

            # --- FedAvg aggregation ---
            fa_new_w = fedavg(fa_updates, sample_counts)
            global_fedavg.set_weights(fa_new_w)
            fa_acc, fa_loss_val = global_fedavg.evaluate(X_test_t, y_test_t)
            fedavg_accuracies.append(round(fa_acc, 4))
            fedavg_losses.append(round(fa_loss_val, 4))
            log(f"  FedAvg   → Acc: {fa_acc:.4f}, Loss: {fa_loss_val:.4f}")

            # --- Trust-Weighted aggregation (pass global_weights for delta scoring) ---
            tr_new_w, trust_scores, anomaly_flags, contribution_weights = \
                trust_weighted_aggregation(tr_updates, global_weights=tr_global_w)
            global_trust.set_weights(tr_new_w)
            tr_acc, tr_loss_val = global_trust.evaluate(X_test_t, y_test_t)
            trust_accuracies.append(round(tr_acc, 4))
            trust_losses.append(round(tr_loss_val, 4))
            log(f"  TrustWt  → Acc: {tr_acc:.4f}, Loss: {tr_loss_val:.4f}")

            # Trust scores per client
            for cid, score in trust_scores.items():
                log(
                    f"    {cid} trust={score:.4f} "
                    f"{'⚠ ANOMALY' if anomaly_flags[cid] else '✓'}"
                )

            all_trust_scores = trust_scores
            all_contribution_weights = contribution_weights
            all_anomaly_flags = anomaly_flags

        # ------------------------------------------------------------------ #
        # 5. Build results
        # ------------------------------------------------------------------ #
        final_fa_acc = fedavg_accuracies[-1] if fedavg_accuracies else 0.0
        final_tr_acc = trust_accuracies[-1] if trust_accuracies else 0.0
        improvement = round((final_tr_acc - final_fa_acc) * 100, 2)

        results = {
            "fedavg_accuracy": fedavg_accuracies,
            "trust_accuracy": trust_accuracies,
            "fedavg_loss": fedavg_losses,
            "trust_loss": trust_losses,
            "trust_scores": {k: round(v, 4) for k, v in all_trust_scores.items()},
            "contribution_weights": {k: round(v, 4) for k, v in all_contribution_weights.items()},
            "anomaly_flags": {k: bool(v) for k, v in all_anomaly_flags.items()},
            "client_types": client_types,
            "num_clients": num_clients,
            "num_malicious": num_malicious,
            "rounds": num_rounds,
            "input_dim": input_dim,
            "num_classes": num_classes,
            "feature_names": feature_names,
            "final_fedavg_accuracy": final_fa_acc,
            "final_trust_accuracy": final_tr_acc,
            "improvement": improvement,
        }

        _simulation_results = results
        log(f"\n✅ Simulation complete.")
        log(f"   FedAvg final accuracy : {final_fa_acc:.4f}")
        log(f"   Trust  final accuracy : {final_tr_acc:.4f}")
        log(f"   Improvement           : {improvement:+.2f}%")
        return results

    except Exception as exc:
        log(f"❌ Simulation error: {str(exc)}")
        logger.exception("Simulation failed")
        raise
    finally:
        _simulation_running = False
