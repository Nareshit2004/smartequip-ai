from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class AIFeedback(Base):
    __tablename__ = "ai_feedback"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String, index=True, nullable=False)
    action_taken = Column(String, nullable=False) # 'ACCEPTED' or 'OVERRIDDEN'
    override_reason = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=func.now(), index=True)
