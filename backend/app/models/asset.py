"""
素材模型
"""
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from app.core.database import Base


class Asset(Base):
    """素材模型"""

    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user = relationship("User")

    type = Column(String(20), nullable=False, index=True)       # image / video / prompt_template
    source = Column(String(20), nullable=False)                  # upload / ai_generated / video_generated / manual
    name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)

    file_path = Column(String(500), nullable=True)
    file_url = Column(String(500), nullable=True)
    content = Column(Text, nullable=True)                        # prompt_template text content
    metadata_json = Column("metadata", Text, nullable=True)      # JSON string

    tags = Column(Text, nullable=True)                           # JSON array
    is_shared = Column(Boolean, default=False, nullable=False)
    related_task_id = Column(Integer, ForeignKey("video_tasks.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def get_tags_list(self) -> list:
        if not self.tags:
            return []
        try:
            return json.loads(self.tags)
        except Exception:
            return []

    def set_tags_list(self, tags: list):
        self.tags = json.dumps(tags, ensure_ascii=False)

    def get_metadata(self) -> dict:
        if not self.metadata_json:
            return {}
        try:
            return json.loads(self.metadata_json)
        except Exception:
            return {}

    def set_metadata(self, data: dict):
        self.metadata_json = json.dumps(data, ensure_ascii=False)
