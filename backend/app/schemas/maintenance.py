from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class FaultReportBase(BaseModel):
    machine_id: str
    category: str
    severity: str
    description: str
    reported_by: str
    ai_prediction_id: Optional[str] = None
    work_order_id: Optional[str] = None

class FaultReportCreate(FaultReportBase):
    pass

class FaultReportUpdate(BaseModel):
    status: Optional[str] = None
    work_order_id: Optional[str] = None

class FaultReportResponse(FaultReportBase):
    id: int
    report_id: str
    status: str
    timestamp: datetime
    
    class Config:
        from_attributes = True

class WorkOrderBase(BaseModel):
    machine_id: str
    fault_report_id: Optional[str] = None
    scheduled_date: datetime
    technician: str
    priority: str
    reason: str
    estimated_duration_hours: float

class WorkOrderCreate(WorkOrderBase):
    pass

class WorkOrderUpdate(BaseModel):
    status: Optional[str] = None
    completed_at: Optional[datetime] = None

class WorkOrderResponse(WorkOrderBase):
    id: int
    order_id: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class NotificationBase(BaseModel):
    machine_id: Optional[str] = None
    machine_name: Optional[str] = None
    type: str
    severity: str
    message: str

class NotificationCreate(NotificationBase):
    pass

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None
    is_resolved: Optional[bool] = None

class NotificationResponse(NotificationBase):
    id: int
    notification_id: str
    is_read: bool
    is_resolved: bool
    timestamp: datetime
    
    class Config:
        from_attributes = True
