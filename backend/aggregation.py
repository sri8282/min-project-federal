"""
aggregation.py — Model Aggregation Strategies
==============================================
Implements two aggregation methods:

1. FedAvg  — equal sample-count weighted averaging (McMahan et al., 2017)
2. Trust-Weighted — weights proportional to per-client trust scores,
   with anomalous clients (statistical outliers) excluded entirely.

KEY FIX: global_weights is now passed through so trust.py can compute
trust on weight DELTAS rather than raw absolute weights.
"""

import torch
import logging
from trust import compute_trust_scores, get_anomaly_flags, normalise_trust_weights

logger = logging.getLogger(__name__)


def fedavg(client_updates: dict, sample_counts: dict) -> dict:
    """
    Federated Averaging: weighted by number of local samples.

    Args:
        client_updates: {client_id: OrderedDict of tensors}
        sample_counts:  {client_id: int}

    Returns:
        Averaged global model state dict.
    """
    total_samples = sum(sample_counts.values())
    avg_state = None

    for cid, state_dict in client_updates.items():
        weight = sample_counts[cid] / total_samples
        if avg_state is None:
            avg_state = {k: v.clone().float() * weight for k, v in state_dict.items()}
        else:
            for k in avg_state:
                avg_state[k] = avg_state[k] + state_dict[k].clone().float() * weight

    logger.info(f"FedAvg aggregated {len(client_updates)} clients.")
    return avg_state


def trust_weighted_aggregation(client_updates: dict,
                               global_weights: dict = None) -> tuple:
    """
    Trust-Weighted Aggregation using relative-deviation + z-score anomaly detection.

    Args:
        client_updates:  {client_id: OrderedDict of tensors}
        global_weights:  previous-round global model state dict (for delta computation)

    Returns:
        (avg_state_dict, trust_scores, anomaly_flags, contribution_weights)
    """
    # Pass global_weights so trust uses deltas (relative to previous round)
    trust_scores      = compute_trust_scores(client_updates, global_weights)
    anomaly_flags     = get_anomaly_flags(trust_scores)
    contribution_weights = normalise_trust_weights(trust_scores, anomaly_flags)

    flagged = [c for c, f in anomaly_flags.items() if f]
    if flagged:
        logger.info(f"Trust-Weighted: excluding {len(flagged)} anomalous clients: {flagged}")
    else:
        logger.info("Trust-Weighted: no anomalies detected — all clients trusted.")

    avg_state = None
    for cid, state_dict in client_updates.items():
        w = contribution_weights[cid]
        if w <= 0:
            continue
        if avg_state is None:
            avg_state = {k: v.clone().float() * w for k, v in state_dict.items()}
        else:
            for k in avg_state:
                avg_state[k] = avg_state[k] + state_dict[k].clone().float() * w

    if avg_state is None:
        # All filtered — fall back to sample-weighted FedAvg
        logger.warning("Trust-Weighted: all clients filtered, falling back to FedAvg.")
        sample_counts = {cid: 1 for cid in client_updates}
        avg_state = fedavg(client_updates, sample_counts)

    logger.info(f"Trust scores: { {k: round(v,4) for k,v in trust_scores.items()} }")
    return avg_state, trust_scores, anomaly_flags, contribution_weights
