import torch
import torch.nn as nn
import math

class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 5000):
        super().__init__()
        position = torch.arange(max_len).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))
        pe = torch.zeros(max_len, 1, d_model)
        pe[:, 0, 0::2] = torch.sin(position * div_term)
        pe[:, 0, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor, shape [seq_len, batch_size, embedding_dim]
        """
        x = x + self.pe[:x.size(0)]
        return x

class TransformerTimeSeries(nn.Module):
    def __init__(
        self, 
        input_dim: int, 
        d_model: int = 64, 
        nhead: int = 4, 
        num_layers: int = 3, 
        dim_feedforward: int = 256, 
        dropout: float = 0.1,
        max_seq_len: int = 100
    ):
        super().__init__()
        self.model_type = 'Transformer'
        self.input_linear = nn.Linear(input_dim, d_model)
        self.pos_encoder = PositionalEncoding(d_model, max_len=max_seq_len)
        
        encoder_layers = nn.TransformerEncoderLayer(
            d_model=d_model, 
            nhead=nhead, 
            dim_feedforward=dim_feedforward, 
            dropout=dropout, 
            batch_first=True # We expect inputs of shape (batch, seq, feature)
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layers, num_layers)
        self.d_model = d_model

    def forward(self, src: torch.Tensor) -> torch.Tensor:
        """
        Args:
            src: Tensor, shape [batch_size, seq_len, input_dim]
        Returns:
            Tensor, shape [batch_size, seq_len, d_model]
        """
        # Linear projection to d_model space
        src = self.input_linear(src) * math.sqrt(self.d_model)
        
        # Positional encoding expects [seq_len, batch_size, d_model] if batch_first=False
        # but we use batch_first=True in our TransformerEncoderLayer, 
        # so pos_encoder needs to handle it properly.
        # Let's adjust for pos_encoder which uses [seq, batch, embed]
        src = src.transpose(0, 1) # [seq_len, batch, d_model]
        src = self.pos_encoder(src)
        src = src.transpose(0, 1) # [batch, seq_len, d_model]
        
        output = self.transformer_encoder(src)
        return output
