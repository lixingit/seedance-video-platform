"""
用户模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    """用户模型"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    tasks = relationship("VideoTask", back_populates="user", cascade="all, delete-orphan")
