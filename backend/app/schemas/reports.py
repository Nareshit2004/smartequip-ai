from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class EquipmentReportItem(BaseModel):
    machine_id: str
    name: str
    health_score: float
    status: str
    rul_days: float
    last_prediction_time: Optional[datetime] = None
    active_faults_count: int = 0

class FaultReportItem(BaseModel):
    report_id: str
    machine_id: str
    category: str
    severity: str
    status: str
    reported_by: str
    timestamp: datetime
    description: str
    work_order_id: Optional[str] = None

class MaintenanceReportItem(BaseModel):
    order_id: str
    machine_id: str
    technician: str
    priority: str
    status: str
    scheduled_date: datetime
    completed_at: Optional[datetime] = None
    estimated_duration_hours: float

class AIReportItem(BaseModel):
    lineage_id: str
    machine_id: str
    model_version: str
    prediction_timestamp: datetime
    confidence: float
    result_type: str
