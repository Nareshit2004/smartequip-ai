from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class AIDataLineageBase(BaseModel):
    lineage_id: str
    result_type: str
    result_id: Optional[str] = None
    machine_id: str
    model_name: str
    model_version: str
    model_run_id: str
    
    input_start_time: Optional[datetime] = None
    input_end_time: Optional[datetime] = None
    input_sample_count: Optional[int] = None
    sensor_ids: Optional[List[str]] = None
    sensor_names: Optional[List[str]] = None
    
    preprocessing_steps: Optional[List[str]] = None
    feature_names: Optional[List[str]] = None
    
    machine_type: Optional[str] = None
    machine_name: Optional[str] = None
    framework: Optional[str] = "PyTorch"
    historical_evidence: Optional[Dict[str, Any]] = None
    
    output_summary: Dict[str, Any]
    confidence: Optional[float] = None

class AIDataLineageCreate(AIDataLineageBase):
    pass

class AIDataLineageResponse(AIDataLineageBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
