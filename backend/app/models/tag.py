"""
标签模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Tag(Base):
    """标签模型"""

    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    color = Column(String(20), nullable=True)  # 标签颜色
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    task_associations = relationship("TaskTag", back_populates="tag", cascade="all, delete-orphan")


class TaskTag(Base):
    """任务-标签关联表"""

    __tablename__ = "task_tags"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("video_tasks.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 关系
    task = relationship("VideoTask", back_populates="tag_associations")
    tag = relationship("Tag", back_populates="task_associations")
