"""
server.py — Global Model Definition
=====================================
Defines the PyTorch MLP used as the global model in federated learning.
The model is dynamically sized at runtime based on the uploaded dataset's
feature count and number of target classes.
"""

import torch
import torch.nn as nn
import copy
import logging

logger = logging.getLogger(__name__)


class FederatedMLP(nn.Module):
    """
    Multi-Layer Perceptron for tabular classification.

    Architecture: Input → 128 → ReLU → 64 → ReLU → 32 → ReLU → num_classes
    """

    def __init__(self, input_dim: int, num_classes: int):
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.LayerNorm(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.LayerNorm(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.network(x)


class GlobalModel:
    """
    Manages the server-side global model, including weight distribution
    and receiving aggregated updates.
    """

    def __init__(self, input_dim: int, num_classes: int):
        self.input_dim = input_dim
        self.num_classes = num_classes
        self.model = FederatedMLP(input_dim, num_classes)
        self.device = torch.device("cpu")  # Local simulation — CPU only
        self.model.to(self.device)
        logger.info(
            f"GlobalModel created: input_dim={input_dim}, num_classes={num_classes}"
        )

    def get_weights(self) -> dict:
        """Return a deep copy of the current global weights."""
        return copy.deepcopy(self.model.state_dict())

    def set_weights(self, state_dict: dict):
        """Load new aggregated weights into the global model."""
        self.model.load_state_dict(state_dict)

    def evaluate(self, X: torch.Tensor, y: torch.Tensor) -> tuple:
        """
        Evaluate the global model on a test set.

        Returns:
            (accuracy: float, loss: float)
        """
        self.model.eval()
        criterion = nn.CrossEntropyLoss()
        with torch.no_grad():
            X = X.to(self.device).float()
            y = y.to(self.device).long()
            logits = self.model(X)
            loss = criterion(logits, y).item()
            preds = logits.argmax(dim=1)
            accuracy = (preds == y).float().mean().item()
        return accuracy, loss
