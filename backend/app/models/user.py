from sqlalchemy import Column, Integer, String, Boolean, Enum
from app.core.database import Base
import enum

class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    ENGINEER = "engineer"
    OPERATOR = "operator"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.OPERATOR, nullable=False)
    is_active = Column(Boolean, default=True)
    full_name = Column(String, nullable=True)
