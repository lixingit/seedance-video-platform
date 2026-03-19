"""
视频任务模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


class TaskStatus(str, enum.Enum):
    """任务状态枚举"""

    PENDING = "pending"
    PROCESSING = "processing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class VideoTask(Base):
    """视频生成任务模型"""

    __tablename__ = "video_tasks"

    id = Column(Integer, primary_key=True, index=True)
    # 火山引擎任务ID
    ark_task_id = Column(String(255), nullable=True, index=True)

    # 用户关联
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="tasks")

    # 任务参数
    prompt = Column(Text, nullable=False)
    negative_prompt = Column(Text, nullable=True)
    duration = Column(Integer, default=4)  # 视频时长（秒）
    resolution = Column(String(50), default="720p")
    motion_intensity = Column(String(20), default="standard")  # gentle, standard, intense

    # 首帧图片
    first_frame_image_path = Column(String(500), nullable=True)
    first_frame_image_url = Column(String(500), nullable=True)

    # 尾帧图片
    last_frame_image_url = Column(String(500), nullable=True)
    last_frame_image_path = Column(String(500), nullable=True)

    # 生成结果
    video_url = Column(String(500), nullable=True)
    video_path = Column(String(500), nullable=True)

    # 任务状态
    status = Column(String(20), default=TaskStatus.PENDING, nullable=False, index=True)
    error_message = Column(Text, nullable=True)

    # 标签和备注
    tags = Column(Text, nullable=True)  # JSON格式存储
    notes = Column(Text, nullable=True)

    # 时间
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # 关系
    tag_associations = relationship("TaskTag", back_populates="task", cascade="all, delete-orphan")

    def get_tags_list(self) -> list:
        """获取标签列表"""
        if not self.tags:
            return []
        import json
        try:
            return json.loads(self.tags)
        except:
            return []

    def set_tags_list(self, tags: list):
        """设置标签列表"""
        import json
        self.tags = json.dumps(tags, ensure_ascii=False)
