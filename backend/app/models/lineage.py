from sqlalchemy import Column, Integer, String, DateTime, Float, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class AIDataLineage(Base):
    __tablename__ = "ai_data_lineage"

    id = Column(Integer, primary_key=True, index=True)
    lineage_id = Column(String, unique=True, index=True, nullable=False)
    result_type = Column(String, index=True, nullable=False) # e.g., 'health_check', 'what_if_simulation'
    result_id = Column(String, index=True, nullable=True) # ID of the associated result if persisted
    machine_id = Column(String, index=True, nullable=False)
    
    model_name = Column(String, nullable=False)
    model_version = Column(String, nullable=False)
    model_run_id = Column(String, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=func.now(), index=True)
    
    # Input Data Traceability
    input_start_time = Column(DateTime(timezone=True), nullable=True)
    input_end_time = Column(DateTime(timezone=True), nullable=True)
    input_sample_count = Column(Integer, nullable=True)
    sensor_ids = Column(JSON, nullable=True)
    sensor_names = Column(JSON, nullable=True)
    
    # Preprocessing & Features
    preprocessing_steps = Column(JSON, nullable=True)
    feature_names = Column(JSON, nullable=True)
    
    # Context & Provenance
    machine_type = Column(String, nullable=True)
    machine_name = Column(String, nullable=True)
    framework = Column(String, default="PyTorch", nullable=True)
    historical_evidence = Column(JSON, nullable=True)
    
    # Output
    output_summary = Column(JSON, nullable=False)
    confidence = Column(Float, nullable=True)
