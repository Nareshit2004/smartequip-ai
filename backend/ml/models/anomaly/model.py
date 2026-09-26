import torch
import torch.nn as nn
from ml.models.transformer.model import TransformerTimeSeries

class TransformerAutoencoder(nn.Module):
    """
    Autoencoder using Transformer for Anomaly Detection.
    The anomaly score is typically the reconstruction error (MSE).
    """
    def __init__(
        self, 
        input_dim: int, 
        d_model: int = 64, 
        nhead: int = 4, 
        num_layers: int = 3,
        max_seq_len: int = 100
    ):
        super().__init__()
        self.encoder = TransformerTimeSeries(
            input_dim=input_dim, 
            d_model=d_model, 
            nhead=nhead, 
            num_layers=num_layers,
            max_seq_len=max_seq_len
        )
        
        # Decoder attempts to reconstruct the original input from the embedded representations
        self.decoder = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Linear(d_model // 2, input_dim)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: [batch_size, seq_len, input_dim]
        returns: reconstructed x: [batch_size, seq_len, input_dim]
        """
        # Encode
        encoded = self.encoder(x) # [batch_size, seq_len, d_model]
        # Decode step-by-step
        decoded = self.decoder(encoded) # [batch_size, seq_len, input_dim]
        return decoded
        
    def compute_anomaly_score(self, x: torch.Tensor) -> torch.Tensor:
        """
        Computes MSE per sequence in the batch.
        x: [batch, seq_len, input_dim]
        returns: [batch]
        """
        reconstructed = self(x)
        mse = torch.mean((x - reconstructed) ** 2, dim=(1, 2))
        return mse

class TransformerPredictor(nn.Module):
    """
    Predicts Failure Risk and RUL (Regression).
    """
    def __init__(self, input_dim: int, d_model: int = 64, nhead: int = 4, num_layers: int = 3):
        super().__init__()
        self.encoder = TransformerTimeSeries(input_dim, d_model, nhead, num_layers)
        
        # Takes the final time step's representation to predict the outcome
        self.risk_head = nn.Sequential(
            nn.Linear(d_model, 32),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.Sigmoid() # 0 to 1 risk
        )
        
        self.rul_head = nn.Sequential(
            nn.Linear(d_model, 32),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.ReLU() # RUL must be positive
        )
        
    def forward(self, x: torch.Tensor):
        encoded = self.encoder(x) # [batch_size, seq_len, d_model]
        # Use the representation of the last time step
        last_step = encoded[:, -1, :] # [batch_size, d_model]
        
        risk = self.risk_head(last_step) # [batch_size, 1]
        rul = self.rul_head(last_step)   # [batch_size, 1]
        
        return risk, rul
