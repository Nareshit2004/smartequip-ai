import numpy as np
import torch
from typing import Tuple, List

class TimeSeriesPreprocessor:
    def __init__(self, window_size: int = 50, stride: int = 1):
        self.window_size = window_size
        self.stride = stride
        self.mean = None
        self.std = None
        
    def handle_missing_values(self, data: np.ndarray) -> np.ndarray:
        """Forward fill then backward fill missing values (NaNs)."""
        import pandas as pd
        df = pd.DataFrame(data)
        df = df.ffill().bfill().fillna(0) # Fallback to 0 if all are NaN
        return df.to_numpy()
        
    def filter_noise(self, data: np.ndarray, window: int = 3) -> np.ndarray:
        """Simple moving average filter to reduce high-frequency noise."""
        import pandas as pd
        df = pd.DataFrame(data)
        return df.rolling(window=window, min_periods=1).mean().to_numpy()
        
    def detect_outliers(self, data: np.ndarray, std_devs: float = 3.0) -> np.ndarray:
        """Cap extreme outliers beyond `std_devs` standard deviations."""
        mean = np.mean(data, axis=0)
        std = np.std(data, axis=0)
        std[std == 0] = 1e-6
        
        # Calculate bounds
        lower_bound = mean - (std_devs * std)
        upper_bound = mean + (std_devs * std)
        
        # Clip
        return np.clip(data, lower_bound, upper_bound)
        
    def fit(self, data: np.ndarray):
        """Fit normalization parameters on training data of shape (N, features)"""
        self.mean = np.mean(data, axis=0)
        self.std = np.std(data, axis=0)
        # Avoid division by zero
        self.std[self.std == 0] = 1e-6
        
    def transform(self, data: np.ndarray) -> np.ndarray:
        """Standardize the data"""
        if self.mean is None or self.std is None:
            raise ValueError("Preprocessor is not fitted.")
        return (data - self.mean) / self.std
        
    def create_windows(self, data: np.ndarray) -> np.ndarray:
        """
        Create sliding windows.
        data: (N, features)
        Returns: (num_windows, window_size, features)
        """
        num_windows = (len(data) - self.window_size) // self.stride + 1
        if num_windows <= 0:
            raise ValueError(f"Data length {len(data)} is too small for window size {self.window_size}")
            
        windows = np.array([
            data[i : i + self.window_size] 
            for i in range(0, len(data) - self.window_size + 1, self.stride)
        ])
        return windows

    def prepare_inference(self, data: np.ndarray) -> torch.Tensor:
        """End-to-end preparation for a batch of inference data"""
        # Formal Feature Representation Pipeline
        data = self.handle_missing_values(data)
        data = self.filter_noise(data)
        data = self.detect_outliers(data)
        
        scaled = self.transform(data)
        
        if len(scaled) == self.window_size:
            # Single window
            windows = np.expand_dims(scaled, axis=0)
        else:
            windows = self.create_windows(scaled)
            
        return torch.FloatTensor(windows)
