from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import get_db
from app.models.maintenance import Notification
from app.models.machine import Machine
from app.schemas.maintenance import NotificationResponse, NotificationUpdate

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification)
        .order_by(Notification.timestamp.desc())
    )
    notifs = result.scalars().all()
    
    # Check if any notification lacks a machine_name and backfill
    unresolved_names = [n for n in notifs if not n.machine_name]
    if unresolved_names:
        m_result = await db.execute(select(Machine))
        machines = m_result.scalars().all()
        machine_map = {f"M-{m.id}": m.name for m in machines}
        machine_map.update({str(m.id): m.name for m in machines})
        
        has_changes = False
        for n in unresolved_names:
            if n.machine_id and n.machine_id in machine_map:
                n.machine_name = machine_map[n.machine_id]
                has_changes = True
            elif n.machine_id:
                n.machine_name = f"Equipment {n.machine_id}"
                has_changes = True
            else:
                n.machine_name = "System Notification"
                has_changes = True
                
        if has_changes:
            await db.commit()
            
    return notifs

@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(notification_id: str, update_data: NotificationUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).filter(Notification.notification_id == notification_id))
    notif = result.scalars().first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    if update_data.is_read is not None:
        notif.is_read = update_data.is_read
    if update_data.is_resolved is not None:
        notif.is_resolved = update_data.is_resolved
        
    await db.commit()
    await db.refresh(notif)
    return notif
