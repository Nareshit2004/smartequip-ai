from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base

class FaultReport(Base):
    __tablename__ = "fault_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String, unique=True, index=True, nullable=False)
    machine_id = Column(String, index=True, nullable=False)
    category = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="Open", nullable=False)
    reported_by = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=func.now(), index=True)
    
    # Optional links
    ai_prediction_id = Column(String, nullable=True)
    work_order_id = Column(String, nullable=True)

class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, unique=True, index=True, nullable=False)
    machine_id = Column(String, index=True, nullable=False)
    fault_report_id = Column(String, nullable=True)
    
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    technician = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    estimated_duration_hours = Column(Float, nullable=False)
    status = Column(String, default="Scheduled", nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    notification_id = Column(String, unique=True, index=True, nullable=False)
    machine_id = Column(String, index=True, nullable=True)
    machine_name = Column(String, nullable=True)
    
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    message = Column(String, nullable=False)
    
    is_read = Column(Boolean, default=False, nullable=False)
    is_resolved = Column(Boolean, default=False, nullable=False)
    
    timestamp = Column(DateTime(timezone=True), default=func.now(), index=True)
