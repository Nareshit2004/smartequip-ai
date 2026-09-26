from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List

from app.core.database import get_db
from app.models.machine import Machine
from app.models.sensor import AIPrediction
from app.models.maintenance import FaultReport, WorkOrder
from app.models.lineage import AIDataLineage
from app.schemas.reports import EquipmentReportItem, FaultReportItem, MaintenanceReportItem, AIReportItem

router = APIRouter()

@router.get("/equipment", response_model=List[EquipmentReportItem])
async def get_equipment_report(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Machine).order_by(Machine.id))
    machines = result.scalars().all()
    
    report = []
    for m in machines:
        # Get latest prediction
        pred_result = await db.execute(
            select(AIPrediction)
            .filter(AIPrediction.machine_id == m.id)
            .order_by(AIPrediction.timestamp.desc())
        )
        latest_pred = pred_result.scalars().first()
        
        # Get active faults
        faults_result = await db.execute(
            select(func.count(FaultReport.id))
            .filter((FaultReport.machine_id == f"M-{m.id}") | (FaultReport.machine_id == str(m.id)))
            .filter(FaultReport.status != "Resolved")
            .filter(FaultReport.status != "Closed")
        )
        faults_count = faults_result.scalar() or 0
        
        report.append(
            EquipmentReportItem(
                machine_id=f"M-{m.id}",
                name=m.name,
                health_score=latest_pred.health_score if latest_pred else m.health_score,
                status=m.status,
                rul_days=latest_pred.rul_days if latest_pred else 0.0,
                last_prediction_time=latest_pred.timestamp if latest_pred else None,
                active_faults_count=faults_count
            )
        )
    return report

@router.get("/faults", response_model=List[FaultReportItem])
async def get_faults_report(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FaultReport).order_by(FaultReport.timestamp.desc()))
    faults = result.scalars().all()
    return [
        FaultReportItem(
            report_id=f.report_id,
            machine_id=f.machine_id,
            category=f.category,
            severity=f.severity,
            status=f.status,
            reported_by=f.reported_by,
            timestamp=f.timestamp,
            description=f.description,
            work_order_id=f.work_order_id
        ) for f in faults
    ]

@router.get("/maintenance", response_model=List[MaintenanceReportItem])
async def get_maintenance_report(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkOrder).order_by(WorkOrder.created_at.desc()))
    orders = result.scalars().all()
    return [
        MaintenanceReportItem(
            order_id=w.order_id,
            machine_id=w.machine_id,
            technician=w.technician,
            priority=w.priority,
            status=w.status,
            scheduled_date=w.scheduled_date,
            completed_at=w.completed_at,
            estimated_duration_hours=w.estimated_duration_hours
        ) for w in orders
    ]

@router.get("/ai", response_model=List[AIReportItem])
async def get_ai_report(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AIDataLineage).order_by(AIDataLineage.created_at.desc()))
    lineage_records = result.scalars().all()
    return [
        AIReportItem(
            lineage_id=l.lineage_id,
            machine_id=l.machine_id,
            model_version=l.model_version,
            prediction_timestamp=l.created_at,
            confidence=l.confidence if l.confidence is not None else 95.0,
            result_type=l.result_type
        ) for l in lineage_records
    ]

