"""
更新数据库中已存在的成功任务的视频 URL
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import SessionLocal
from app.models import VideoTask
from app.core.config import settings
from volcenginesdkarkruntime import Ark
from datetime import datetime

print("更新成功任务的视频 URL...")

client = Ark(
    base_url=settings.ARK_BASE_URL,
    api_key=settings.ARK_API_KEY,
)

db = SessionLocal()

try:
    tasks = db.query(VideoTask).filter(VideoTask.status == 'succeeded').all()

    for task in tasks:
        if not task.ark_task_id:
            continue

        print(f"\n处理任务 {task.id} (ark_id: {task.ark_task_id})...")

        result = client.content_generation.tasks.get(task_id=task.ark_task_id)

        if hasattr(result, 'content') and result.content:
            if hasattr(result.content, 'video_url'):
                task.video_url = result.content.video_url
                task.updated_at = datetime.utcnow()
                print(f"  ✓ 更新视频 URL: {result.content.video_url[:80]}...")

    db.commit()
    print(f"\n ✓ 完成！共更新 {len(tasks)} 个任务")

finally:
    db.close()
