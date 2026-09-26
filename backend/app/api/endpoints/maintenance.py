from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import uuid

from app.core.database import get_db
from app.models.machine import Machine
from app.models.maintenance import FaultReport, WorkOrder, Notification
from app.schemas.maintenance import FaultReportCreate, FaultReportResponse, FaultReportUpdate
from app.schemas.maintenance import WorkOrderCreate, WorkOrderResponse, WorkOrderUpdate

router = APIRouter()

async def _get_machine_name(db: AsyncSession, machine_id_str: str) -> str:
    if not machine_id_str:
        return "System Alert"
    try:
        raw_num = str(machine_id_str).replace("M-", "").strip()
        if raw_num.isdigit():
            m_res = await db.execute(select(Machine).filter(Machine.id == int(raw_num)))
            m = m_res.scalars().first()
            if m:
                return m.name
    except Exception:
        pass
    return f"Equipment {machine_id_str}"

# --- Fault Reports ---

@router.post("/fault-reports", response_model=FaultReportResponse)
async def create_fault_report(report: FaultReportCreate, db: AsyncSession = Depends(get_db)):
    report_id = f"FR-{uuid.uuid4().hex[:8].upper()}"
    db_report = FaultReport(
        report_id=report_id,
        **report.model_dump()
    )
    db.add(db_report)
    
    # Also create a notification for the fault report creation with populated machine_name
    machine_name = await _get_machine_name(db, report.machine_id)
    notif_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
    notif = Notification(
        notification_id=notif_id,
        machine_id=report.machine_id,
        machine_name=machine_name,
        type="fault_created",
        severity="Warning",
        message=f"New Fault Report {report_id} created for {machine_name} by {report.reported_by}."
    )
    db.add(notif)
    
    await db.commit()
    await db.refresh(db_report)
    return db_report

@router.get("/fault-reports", response_model=List[FaultReportResponse])
async def get_fault_reports(machine_id: str = None, db: AsyncSession = Depends(get_db)):
    query = select(FaultReport).order_by(FaultReport.timestamp.desc())
    if machine_id:
        clean = str(machine_id).replace("M-", "").strip()
        variants = [machine_id, clean, f"M-{clean}"]
        query = query.filter(FaultReport.machine_id.in_(variants))
    
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/fault-reports/{report_id}", response_model=FaultReportResponse)
async def update_fault_report(report_id: str, update_data: FaultReportUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FaultReport).filter(FaultReport.report_id == report_id))
    db_report = result.scalars().first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Fault Report not found")
        
    if update_data.status:
        db_report.status = update_data.status
    if update_data.work_order_id:
        db_report.work_order_id = update_data.work_order_id
        
    await db.commit()
    await db.refresh(db_report)
    return db_report

# --- Work Orders ---

@router.post("/work-orders", response_model=WorkOrderResponse)
async def create_work_order(order: WorkOrderCreate, db: AsyncSession = Depends(get_db)):
    order_id = f"WO-{uuid.uuid4().hex[:8].upper()}"
    db_order = WorkOrder(
        order_id=order_id,
        **order.model_dump()
    )
    db.add(db_order)
    
    # Link to fault report if provided
    if order.fault_report_id:
        fr_result = await db.execute(select(FaultReport).filter(FaultReport.report_id == order.fault_report_id))
        fr = fr_result.scalars().first()
        if fr:
            fr.work_order_id = order_id
            fr.status = "Maintenance Scheduled"
            
    # Create a notification with populated machine_name
    machine_name = await _get_machine_name(db, order.machine_id)
    notif_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
    notif = Notification(
        notification_id=notif_id,
        machine_id=order.machine_id,
        machine_name=machine_name,
        type="work_order_assigned",
        severity="Info",
        message=f"Work Order {order_id} assigned to {order.technician} for {machine_name}."
    )
    db.add(notif)
    
    await db.commit()
    await db.refresh(db_order)
    return db_order

@router.get("/work-orders", response_model=List[WorkOrderResponse])
async def get_work_orders(machine_id: str = None, db: AsyncSession = Depends(get_db)):
    query = select(WorkOrder).order_by(WorkOrder.created_at.desc())
    if machine_id:
        clean = str(machine_id).replace("M-", "").strip()
        variants = [machine_id, clean, f"M-{clean}"]
        query = query.filter(WorkOrder.machine_id.in_(variants))
        
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/work-orders/{order_id}", response_model=WorkOrderResponse)
async def update_work_order(order_id: str, update_data: WorkOrderUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WorkOrder).filter(WorkOrder.order_id == order_id))
    db_order = result.scalars().first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    if update_data.status:
        db_order.status = update_data.status
        
        # Notification for status change with machine_name
        machine_name = await _get_machine_name(db, db_order.machine_id)
        notif_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
        notif = Notification(
            notification_id=notif_id,
            machine_id=db_order.machine_id,
            machine_name=machine_name,
            type="work_order_status_changed",
            severity="Info",
            message=f"Work Order {order_id} ({machine_name}) status updated to {update_data.status}."
        )
        db.add(notif)
        
    if update_data.completed_at:
        db_order.completed_at = update_data.completed_at
        
    await db.commit()
    await db.refresh(db_order)
    return db_order
