"""
异步任务队列管理
使用后台线程轮询任务状态
"""
import threading
import time
import logging
from typing import Dict, Optional, Set
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import VideoTask, TaskStatus
from app.services.seedance import get_seedance_service

logger = logging.getLogger(__name__)


class TaskPoller:
    """任务轮询器"""

    def __init__(self):
        self.running = False
        self.thread: Optional[threading.Thread] = None
        self.polling_task_ids: Set[int] = set()
        self.lock = threading.Lock()

    def start(self):
        """启动轮询器"""
        if self.running:
            return

        self.running = True
        self.thread = threading.Thread(target=self._poll_loop, daemon=True)
        self.thread.start()
        logger.info("Task poller started")

    def stop(self):
        """停止轮询器"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        logger.info("Task poller stopped")

    def add_task(self, task_id: int):
        """添加任务到轮询列表"""
        with self.lock:
            self.polling_task_ids.add(task_id)
        logger.debug(f"Added task {task_id} to polling list")

    def remove_task(self, task_id: int):
        """从轮询列表移除任务"""
        with self.lock:
            self.polling_task_ids.discard(task_id)
        logger.debug(f"Removed task {task_id} from polling list")

    def _poll_loop(self):
        """轮询循环"""
        while self.running:
            try:
                self._poll_once()
            except Exception as e:
                logger.error(f"Error in poll loop: {e}")

            time.sleep(2)  # 每2秒检查一次

    def _poll_once(self):
        """执行一次轮询"""
        # 获取当前需要轮询的任务ID列表
        with self.lock:
            task_ids = list(self.polling_task_ids)

        if not task_ids:
            return

        db = SessionLocal()
        try:
            seedance_service = get_seedance_service()
            if not seedance_service.is_available():
                return

            for task_id in task_ids:
                try:
                    self._update_task_status(db, task_id, seedance_service)
                except Exception as e:
                    logger.error(f"Failed to update task {task_id}: {e}")

        finally:
            db.close()

    def _update_task_status(self, db: Session, task_id: int, seedance_service):
        """更新单个任务状态"""
        task = db.query(VideoTask).filter(VideoTask.id == task_id).first()
        if not task:
            self.remove_task(task_id)
            return

        # 如果任务已经是终态，从轮询列表移除
        if task.status in [TaskStatus.SUCCEEDED, TaskStatus.FAILED]:
            self.remove_task(task_id)
            return

        if not task.ark_task_id:
            return

        # 查询 Seedance 任务状态
        result = seedance_service.get_task_status(task.ark_task_id)
        new_status = result["status"]

        # 更新任务状态
        if new_status == "succeeded":
            task.status = TaskStatus.SUCCEEDED
            task.video_url = result["video_url"]
            task.completed_at = datetime.utcnow()
            self.remove_task(task_id)
            logger.info(f"Task {task_id} completed successfully")

        elif new_status == "failed":
            task.status = TaskStatus.FAILED
            task.error_message = str(result.get("error", "Unknown error"))
            task.completed_at = datetime.utcnow()
            self.remove_task(task_id)
            logger.error(f"Task {task_id} failed: {task.error_message}")

        elif new_status in ["processing", "queued", "in_progress", "running"]:
            task.status = TaskStatus.PROCESSING

        task.updated_at = datetime.utcnow()
        db.commit()


# 全局轮询器实例
_task_poller: Optional[TaskPoller] = None


def get_task_poller() -> TaskPoller:
    """获取任务轮询器实例"""
    global _task_poller
    if _task_poller is None:
        _task_poller = TaskPoller()
    return _task_poller


def start_task_poller():
    """启动任务轮询器"""
    get_task_poller().start()


def stop_task_poller():
    """停止任务轮询器"""
    if _task_poller:
        _task_poller.stop()
