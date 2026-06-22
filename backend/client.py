"""
client.py — Local Client Trainer
==================================
Each simulated federated learning client:
  - Holds a partition of the dataset (real data, not synthetic)
  - Trains a local copy of the global model for a fixed number of epochs
  - Returns the updated weights and per-epoch loss history

Malicious clients apply one of two attack strategies:
  - label_flip  : randomly flip labels to another class
  - noise_inject: add large Gaussian noise to gradients before returning
"""

import copy
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import logging
from server import FederatedMLP

logger = logging.getLogger(__name__)

LOCAL_EPOCHS  = 5       # More epochs → stronger signal, better trust differentiation
BATCH_SIZE    = 32
LEARNING_RATE = 0.003   # Slightly lower LR for more stable convergence
NOISE_SCALE   = 8.0     # Bigger noise makes malicious clients easier to detect


class ClientTrainer:
    """Simulates a single federated learning client."""

    def __init__(
        self,
        client_id: str,
        X: np.ndarray,
        y: np.ndarray,
        is_malicious: bool = False,
        attack_type: str = "label_flip",
    ):
        self.client_id = client_id
        self.is_malicious = is_malicious
        self.attack_type = attack_type
        self.device = torch.device("cpu")

        # Apply malicious behaviour at data level (label flip)
        if is_malicious and attack_type == "label_flip":
            y = self._flip_labels(y)
            logger.info(f"Client {client_id}: MALICIOUS — labels flipped.")
        else:
            logger.debug(f"Client {client_id}: NORMAL")

        self.X_tensor = torch.tensor(X, dtype=torch.float32)
        self.y_tensor = torch.tensor(y, dtype=torch.long)
        self.num_samples = len(y)

    def _flip_labels(self, y: np.ndarray) -> np.ndarray:
        """Randomly reassign labels to a different class."""
        classes = np.unique(y)
        flipped = y.copy()
        if len(classes) < 2:
            return flipped
        for i in range(len(flipped)):
            other_classes = classes[classes != flipped[i]]
            flipped[i] = np.random.choice(other_classes)
        return flipped

    def train(self, global_weights: dict, input_dim: int, num_classes: int) -> tuple:
        """
        Train locally for LOCAL_EPOCHS epochs.

        Args:
            global_weights: current global model state dict
            input_dim:      number of input features
            num_classes:    number of target classes

        Returns:
            (local_weights, loss_history)
            local_weights: OrderedDict of tensors (possibly poisoned by noise)
            loss_history:  list of float, one per epoch
        """
        model = FederatedMLP(input_dim, num_classes).to(self.device)
        model.load_state_dict(global_weights)
        model.train()

        optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
        criterion = nn.CrossEntropyLoss()
        dataset = TensorDataset(self.X_tensor, self.y_tensor)
        loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

        loss_history = []
        for epoch in range(LOCAL_EPOCHS):
            epoch_loss = 0.0
            batches = 0
            for X_batch, y_batch in loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)
                optimizer.zero_grad()
                logits = model(X_batch)
                loss = criterion(logits, y_batch)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
                batches += 1
            avg_loss = epoch_loss / max(batches, 1)
            loss_history.append(avg_loss)
            logger.debug(
                f"Client {self.client_id} epoch {epoch+1}/{LOCAL_EPOCHS} loss={avg_loss:.4f}"
            )

        local_weights = copy.deepcopy(model.state_dict())

        # Noise injection attack: corrupt weights after training
        if self.is_malicious and self.attack_type == "noise_inject":
            logger.info(f"Client {self.client_id}: MALICIOUS — injecting weight noise.")
            with torch.no_grad():
                for key in local_weights:
                    local_weights[key] += torch.randn_like(local_weights[key]) * NOISE_SCALE

        logger.info(
            f"Client {self.client_id} trained. "
            f"Samples={self.num_samples}, Final loss={loss_history[-1]:.4f}"
        )
        return local_weights, loss_history
