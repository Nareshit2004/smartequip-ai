import os
import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import mlflow
import mlflow.pytorch
from datetime import datetime
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score, 
    mean_absolute_error, mean_squared_error, average_precision_score,
    confusion_matrix
)

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ml.preprocessing.time_series import TimeSeriesPreprocessor
from ml.models.anomaly.model import TransformerAutoencoder, TransformerPredictor

def generate_synthetic_data(num_samples=1000, seq_len=10, input_dim=6):
    """Generate mock historical data since we don't have a massive DB on disk yet."""
    # Healthy data
    X = np.random.normal(loc=0.0, scale=1.0, size=(num_samples, seq_len, input_dim))
    
    # Anomaly labels (5% anomaly)
    y_anomaly = np.random.choice([0, 1], size=(num_samples,), p=[0.95, 0.05])
    
    # Introduce anomalies by spiking the values
    for i in range(num_samples):
        if y_anomaly[i] == 1:
            X[i, -1, :] += np.random.normal(3.0, 1.0, size=(input_dim,))
            
    # Risk labels (correlates with anomalies, plus some random wear)
    y_risk = (y_anomaly * 0.8) + np.random.uniform(0, 0.2, size=(num_samples,))
    y_risk = np.clip(y_risk, 0, 1)
    
    # RUL labels (inversely correlated with risk)
    y_rul = (1.0 - y_risk) * 200 + np.random.normal(0, 10, size=(num_samples,))
    y_rul = np.clip(y_rul, 1, 200)
    
    return X, y_anomaly, y_risk, y_rul

def train_and_evaluate():
    mlflow.set_tracking_uri("sqlite:///mlflow.db")
    mlflow.set_experiment("smart_equipment_ai_training")
    
    print("Generating synthetic historical data...")
    X, y_anomaly, y_risk, y_rul = generate_synthetic_data(num_samples=2000)
    
    # Simulating the preprocessing layer
    preprocessor = TimeSeriesPreprocessor(window_size=10)
    # Fit preprocessor on flattened data to get global mean/std
    flattened = X.reshape(-1, X.shape[-1])
    preprocessor.fit(flattened)
    
    # For training, we apply the formal representation pipeline manually
    # Note: X is already windowed here (num_samples, seq_len, input_dim)
    # We flatten, transform, and reshape back for training
    X_processed = preprocessor.handle_missing_values(flattened)
    X_processed = preprocessor.filter_noise(X_processed)
    X_processed = preprocessor.detect_outliers(X_processed)
    X_scaled = preprocessor.transform(X_processed)
    X_tensor = torch.FloatTensor(X_scaled.reshape(X.shape))
    
    y_anomaly_tensor = torch.FloatTensor(y_anomaly)
    y_risk_tensor = torch.FloatTensor(y_risk).unsqueeze(1)
    y_rul_tensor = torch.FloatTensor(y_rul).unsqueeze(1)
    
    # Model Setup
    input_dim = 6
    d_model = 64
    autoencoder = TransformerAutoencoder(input_dim=input_dim, d_model=d_model)
    predictor = TransformerPredictor(input_dim=input_dim, d_model=d_model)
    
    optimizer_ae = optim.Adam(autoencoder.parameters(), lr=0.001)
    optimizer_pred = optim.Adam(predictor.parameters(), lr=0.001)
    
    mse_loss = nn.MSELoss()
    bce_loss = nn.BCELoss()
    
    epochs = 5
    
    with mlflow.start_run():
        mlflow.log_params({
            "model_type": "TransformerTimeSeries",
            "epochs": epochs,
            "d_model": d_model,
            "seq_len": 10,
            "input_dim": 6,
            "dataset_version": "v1-synthetic",
            "training_timestamp": datetime.now().isoformat()
        })
        
        print(f"Training models for {epochs} epochs...")
        autoencoder.train()
        predictor.train()
        
        for epoch in range(epochs):
            # 1. Train Autoencoder (Unsupervised)
            optimizer_ae.zero_grad()
            reconstructed = autoencoder(X_tensor)
            loss_ae = mse_loss(reconstructed, X_tensor)
            loss_ae.backward()
            optimizer_ae.step()
            
            # 2. Train Predictor (Supervised)
            optimizer_pred.zero_grad()
            risk_pred, rul_pred = predictor(X_tensor)
            loss_risk = bce_loss(risk_pred, y_risk_tensor)
            loss_rul = mse_loss(rul_pred, y_rul_tensor)
            loss_pred = loss_risk + (loss_rul * 0.001) # scale RUL loss
            loss_pred.backward()
            optimizer_pred.step()
            
            print(f"Epoch {epoch+1}/{epochs} | AE Loss: {loss_ae.item():.4f} | Pred Loss: {loss_pred.item():.4f}")
            
        print("Evaluating models...")
        autoencoder.eval()
        predictor.eval()
        
        with torch.no_grad():
            # Evaluate Autoencoder
            recon = autoencoder(X_tensor)
            mse_scores = torch.mean((X_tensor - recon)**2, dim=(1,2)).numpy()
            
            # Use 95th percentile as anomaly threshold
            threshold = np.percentile(mse_scores, 95)
            y_anomaly_pred = (mse_scores > threshold).astype(int)
            
            # Evaluate Predictor
            risk_pred, rul_pred = predictor(X_tensor)
            risk_pred_np = risk_pred.numpy().flatten()
            rul_pred_np = rul_pred.numpy().flatten()
            
            # Binarize risk for classification metrics (>0.5)
            y_risk_binary = (y_risk > 0.5).astype(int)
            y_risk_pred_binary = (risk_pred_np > 0.5).astype(int)
            
        # Metric Calculations
        # 1. Anomaly Detection
        metrics = {}
        # Ensure we have both classes before calculating AUC
        if len(np.unique(y_anomaly)) > 1:
            metrics["anomaly_precision"] = precision_score(y_anomaly, y_anomaly_pred, zero_division=0)
            metrics["anomaly_recall"] = recall_score(y_anomaly, y_anomaly_pred, zero_division=0)
            metrics["anomaly_f1"] = f1_score(y_anomaly, y_anomaly_pred, zero_division=0)
            metrics["anomaly_pr_auc"] = average_precision_score(y_anomaly, mse_scores)
            
            tn, fp, fn, tp = confusion_matrix(y_anomaly, y_anomaly_pred).ravel()
            metrics["anomaly_false_alarm_rate"] = fp / (fp + tn) if (fp + tn) > 0 else 0.0
            
        # 2. Failure Prediction
        if len(np.unique(y_risk_binary)) > 1:
            metrics["risk_precision"] = precision_score(y_risk_binary, y_risk_pred_binary, zero_division=0)
            metrics["risk_recall"] = recall_score(y_risk_binary, y_risk_pred_binary, zero_division=0)
            metrics["risk_f1"] = f1_score(y_risk_binary, y_risk_pred_binary, zero_division=0)
            metrics["risk_roc_auc"] = roc_auc_score(y_risk_binary, risk_pred_np)
            metrics["risk_pr_auc"] = average_precision_score(y_risk_binary, risk_pred_np)
            
        # 3. RUL
        metrics["rul_mae"] = mean_absolute_error(y_rul, rul_pred_np)
        metrics["rul_rmse"] = np.sqrt(mean_squared_error(y_rul, rul_pred_np))
        
        mlflow.log_metrics(metrics)
        print("Logged metrics to MLflow:")
        # Log artifacts (Models) using cloudpickle to avoid strict TorchScript pt2 tracing errors on tuple outputs
        mlflow.pytorch.log_model(
            autoencoder, 
            "transformer_autoencoder", 
            serialization_format="cloudpickle"
        )
        mlflow.pytorch.log_model(
            predictor, 
            "transformer_predictor", 
            serialization_format="cloudpickle"
        )
        print("Models successfully registered to MLflow. Production inference logic remains isolated and unaffected.")

if __name__ == "__main__":
    train_and_evaluate()
