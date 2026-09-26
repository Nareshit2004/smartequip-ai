from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
from sqlalchemy.sql import func
from app.core.database import Base

class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=func.now(), index=True)
    
    # Core sensors
    temperature = Column(Float, nullable=False)
    vibration = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    rpm = Column(Float, nullable=False)
    current = Column(Float, nullable=False)
    voltage = Column(Float, nullable=False)
    
    # Optional flags
    is_anomaly = Column(Integer, default=0) # 0 for normal, 1 for anomaly

class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=func.now(), index=True)
    
    failure_risk = Column(Float, nullable=False) # 0-100%
    rul_days = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False) # 0-100%
    health_score = Column(Float, nullable=False) # 0-100
    
    explanation_json = Column(String, nullable=True) # Store JSON string of contributing factors
    unreliable_sensors_json = Column(String, nullable=True) # Store JSON string of contributing factors
    root_cause_analysis = Column(String, nullable=True)
    recommendation = Column(String, nullable=True)
