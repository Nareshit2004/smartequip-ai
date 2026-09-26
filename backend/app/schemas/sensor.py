from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class SensorDataCreate(BaseModel):
    machine_id: int
    timestamp: Optional[datetime] = None
    temperature: float
    vibration: float
    pressure: float
    rpm: float
    current: float
    voltage: float
    is_anomaly: Optional[int] = 0

class SensorDataResponse(SensorDataCreate):
    id: int

    class Config:
        from_attributes = True

class AIPredictionResponse(BaseModel):
    id: int
    machine_id: int
    timestamp: datetime
    failure_risk: float
    rul_days: float
    confidence: float
    health_score: float
    explanation_json: Optional[str] = None
    unreliable_sensors_json: Optional[str] = None
    unreliable_sensors: Optional[List[str]] = []
    explanation: Optional[Dict[str, Any]] = {}
    recommendation: Optional[str] = None
    root_cause_analysis: Optional[str] = None

    class Config:
        from_attributes = True

class AIFeedbackCreate(BaseModel):
    machine_id: str
    action_taken: str
    override_reason: Optional[str] = None
