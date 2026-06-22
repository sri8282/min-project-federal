"""
trust.py — Trust Score Computation (Fixed: Relative Deviation + Z-Score Outlier Detection)
============================================================================================

ROOT CAUSE OF PREVIOUS BUG:
    ALPHA=0.5 applied to absolute L2 norms of full weight vectors produced
    trust ≈ exp(-0.5 × 150) ≈ 0 for EVERY client, causing all to be flagged
    as anomalous and triggering the equal-weight fallback — making trust worse
    than FedAvg.

FIX:
    1. Compute deviation on weight DELTAS (change from global model), not raw weights.
       Deltas are much smaller and capture what each client actually learned.
    2. Use RELATIVE deviation: divide by the L2 norm of the mean delta (scale-invariant).
    3. Use statistical Z-score outlier detection instead of a fixed threshold:
       anomaly if relative_dev_i > mean_dev + 2.0 × std_dev
    4. Clients are scored in [0, 1] based on their relative rank among peers.
"""

import numpy as np
import logging

logger = logging.getLogger(__name__)

Z_THRESHOLD = 2.0       # Standard deviations above mean = anomaly
MIN_TRUST   = 0.05      # Floor trust for non-anomalous clients
EPSILON     = 1e-8      # Avoid division by zero


def flatten_weights(weights: dict) -> np.ndarray:
    """Flatten an OrderedDict of tensors into a single 1-D numpy array."""
    vectors = []
    for v in weights.values():
        arr = v.detach().cpu().numpy().flatten().astype(np.float64)
        vectors.append(arr)
    return np.concatenate(vectors)


def compute_trust_scores(client_updates: dict,
                         global_weights: dict = None) -> dict:
    """
    Compute trust scores for every client using relative deviation + z-score.

    If global_weights is provided, deviation is computed on weight DELTAS
    (local_update - global_weights), which is more informative than raw weights.

    Args:
        client_updates: {client_id: OrderedDict of param tensors}
        global_weights: optional global model state dict (previous round)

    Returns:
        {client_id: float in [MIN_TRUST, 1.0]}
    """
    if not client_updates:
        return {}

    client_ids = list(client_updates.keys())

    # ── Step 1: Build comparison vectors (delta or raw weight) ──────────── #
    if global_weights is not None:
        flat_global = flatten_weights(global_weights)
        flat_vecs = {
            cid: flatten_weights(client_updates[cid]) - flat_global
            for cid in client_ids
        }
    else:
        flat_vecs = {cid: flatten_weights(client_updates[cid]) for cid in client_ids}

    # ── Step 2: Compute mean vector & relative deviations ───────────────── #
    stacked  = np.stack(list(flat_vecs.values()), axis=0)  # (N, D)
    mean_vec = stacked.mean(axis=0)
    mean_norm = np.linalg.norm(mean_vec) + EPSILON

    deviations = {}
    for cid in client_ids:
        abs_dev = float(np.linalg.norm(flat_vecs[cid] - mean_vec))
        # Relative deviation: normalise by the scale of the mean update
        deviations[cid] = abs_dev / mean_norm

    dev_values = np.array(list(deviations.values()))
    logger.info(f"Relative deviations: min={dev_values.min():.4f} "
                f"mean={dev_values.mean():.4f} max={dev_values.max():.4f}")

    # ── Step 3: Z-score — flag statistical outliers ──────────────────────── #
    dev_mean = dev_values.mean()
    dev_std  = dev_values.std() + EPSILON      # avoid zero std (all same)

    anomaly_raw: dict = {}
    z_scores: dict = {}
    for cid in client_ids:
        z = (deviations[cid] - dev_mean) / dev_std
        z_scores[cid] = z
        anomaly_raw[cid] = bool(z > Z_THRESHOLD)
        logger.info(f"  {cid}: rel_dev={deviations[cid]:.4f}, z={z:.2f}, "
                    f"anomaly={'YES ⚠' if anomaly_raw[cid] else 'no'}")

    # ── Step 4: Assign trust scores (1 - normalised_dev for non-anomalous) ─ #
    # Normalise deviations to [0, 1] range within this round
    dev_min = dev_values.min()
    dev_range = dev_values.max() - dev_min + EPSILON

    trust_scores: dict = {}
    for cid in client_ids:
        if anomaly_raw[cid]:
            trust_scores[cid] = MIN_TRUST  # near-zero but not exactly zero (display)
        else:
            normalised = (deviations[cid] - dev_min) / dev_range
            # Higher relative dev → lower trust; map to [0.4, 1.0] for non-anomalous
            trust_scores[cid] = max(MIN_TRUST, 1.0 - 0.6 * normalised)

    return trust_scores


def get_anomaly_flags(trust_scores: dict) -> dict:
    """
    Return True for clients with trust at the floor (MIN_TRUST = anomalous).

    Args:
        trust_scores: {client_id: float}

    Returns:
        {client_id: bool}
    """
    return {cid: (score <= MIN_TRUST + 1e-6) for cid, score in trust_scores.items()}


def normalise_trust_weights(trust_scores: dict, anomaly_flags: dict) -> dict:
    """
    Build normalised aggregation weights.
    Anomalous clients receive weight 0; remaining weights sum to 1.

    If somehow ALL clients are flagged (degenerate case), fall back to equal weights
    so the Trust branch does not collapse.
    """
    weights = {cid: (0.0 if anomaly_flags[cid] else score)
               for cid, score in trust_scores.items()}

    total = sum(weights.values())
    if total <= EPSILON:
        logger.warning("All clients flagged anomalous — using equal weights as fallback.")
        n = len(trust_scores)
        return {cid: 1.0 / n for cid in trust_scores}

    return {cid: w / total for cid, w in weights.items()}
