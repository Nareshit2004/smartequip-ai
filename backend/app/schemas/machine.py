from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MachineBase(BaseModel):
    name: str
    type: str
    status: Optional[str] = "Active"

class MachineCreate(MachineBase):
    pass

class MachineResponse(MachineBase):
    id: int
    health_score: float
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
