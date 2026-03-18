"""
视频生成相关 API
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.models import User, VideoTask, TaskStatus
from app.api.schemas import (
    VideoTaskCreate,
    VideoTaskResponse,
    VideoTaskDetail,
    UpdateTagsRequest,
    UpdateNotesRequest,
    MessageResponse,
)
from app.services import get_seedance_service, get_task_poller

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/videos", tags=["videos"])


def get_or_create_user(db: Session, username: str) -> User:
    """获取或创建用户"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(username=username)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("", response_model=VideoTaskResponse)
async def create_video_task(
    request: VideoTaskCreate,
    username: str,
    db: Session = Depends(get_db),
):
    """
    创建视频生成任务
    """
    logger.info(f"Creating video task for user: {username}")

    # 获取或创建用户
    user = get_or_create_user(db, username)

    # 创建数据库任务记录
    task = VideoTask(
        user_id=user.id,
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        duration=request.duration,
        motion_intensity=request.motion_intensity,
        first_frame_image_url=request.first_frame_image_url,
        status=TaskStatus.PENDING,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # 调用 Seedance API
    try:
        seedance_service = get_seedance_service()
        if not seedance_service.is_available():
            raise HTTPException(status_code=500, detail="Seedance service not available")

        result = seedance_service.create_video_task(
            prompt=request.prompt,
            duration=request.duration,
            camera_fixed=False,
            watermark=True,
            first_frame_url=request.first_frame_image_url,
            negative_prompt=request.negative_prompt,
        )

        task.ark_task_id = result["task_id"]
        task.status = TaskStatus.PROCESSING
        db.commit()
        db.refresh(task)

        # 添加到轮询队列
        get_task_poller().add_task(task.id)

    except Exception as e:
        logger.error(f"Failed to create Seedance task: {e}")
        task.status = TaskStatus.FAILED
        task.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to create video task: {e}")

    return task


@router.get("", response_model=List[VideoTaskDetail])
async def list_tasks(
    username: str,
    all_team: bool = False,
    search: str = "",
    tag: str = "",
    db: Session = Depends(get_db),
):
    """
    获取任务列表
    """
    user = get_or_create_user(db, username)

    query = db.query(VideoTask)

    if not all_team:
        query = query.filter(VideoTask.user_id == user.id)

    if search:
        query = query.filter(
            or_(
                VideoTask.prompt.contains(search),
                VideoTask.notes.contains(search),
            )
        )

    # 按时间倒序排列
    query = query.order_by(desc(VideoTask.created_at))

    tasks = query.all()

    # 补充标签列表
    result = []
    for task in tasks:
        task_detail = VideoTaskDetail.model_validate(task)
        task_detail.tags_list = task.get_tags_list()
        result.append(task_detail)

    return result


@router.get("/{task_id}", response_model=VideoTaskDetail)
async def get_task(
    task_id: int,
    username: str,
    db: Session = Depends(get_db),
):
    """
    获取单个任务详情
    """
    user = get_or_create_user(db, username)
    task = db.query(VideoTask).filter(VideoTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # 检查权限
    if task.user_id != user.id:
        # 检查是否可以查看团队内容（这里简单处理，都可以看）
        pass

    task_detail = VideoTaskDetail.model_validate(task)
    task_detail.tags_list = task.get_tags_list()
    return task_detail


@router.post("/{task_id}/refresh", response_model=VideoTaskDetail)
async def refresh_task_status(
    task_id: int,
    username: str,
    db: Session = Depends(get_db),
):
    """
    手动刷新任务状态
    """
    user = get_or_create_user(db, username)
    task = db.query(VideoTask).filter(VideoTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status in [TaskStatus.SUCCEEDED, TaskStatus.FAILED]:
        task_detail = VideoTaskDetail.model_validate(task)
        task_detail.tags_list = task.get_tags_list()
        return task_detail

    if not task.ark_task_id:
        raise HTTPException(status_code=400, detail="No Ark task ID")

    # 主动查询状态
    seedance_service = get_seedance_service()
    if not seedance_service.is_available():
        raise HTTPException(status_code=500, detail="Seedance service not available")

    result = seedance_service.get_task_status(task.ark_task_id)
    new_status = result["status"]

    if new_status == "succeeded":
        task.status = TaskStatus.SUCCEEDED
        task.video_url = result["video_url"]
        task.completed_at = datetime.utcnow()
    elif new_status == "failed":
        task.status = TaskStatus.FAILED
        task.error_message = str(result.get("error", "Unknown error"))
        task.completed_at = datetime.utcnow()
    elif new_status == "processing":
        task.status = TaskStatus.PROCESSING

    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    task_detail = VideoTaskDetail.model_validate(task)
    task_detail.tags_list = task.get_tags_list()
    return task_detail


@router.put("/{task_id}/tags", response_model=VideoTaskDetail)
async def update_task_tags(
    task_id: int,
    request: UpdateTagsRequest,
    username: str,
    db: Session = Depends(get_db),
):
    """
    更新任务标签
    """
    user = get_or_create_user(db, username)
    task = db.query(VideoTask).filter(VideoTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.set_tags_list(request.tags)
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    task_detail = VideoTaskDetail.model_validate(task)
    task_detail.tags_list = task.get_tags_list()
    return task_detail


@router.put("/{task_id}/notes", response_model=VideoTaskDetail)
async def update_task_notes(
    task_id: int,
    request: UpdateNotesRequest,
    username: str,
    db: Session = Depends(get_db),
):
    """
    更新任务备注
    """
    user = get_or_create_user(db, username)
    task = db.query(VideoTask).filter(VideoTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.notes = request.notes
    task.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(task)

    task_detail = VideoTaskDetail.model_validate(task)
    task_detail.tags_list = task.get_tags_list()
    return task_detail


@router.delete("/{task_id}", response_model=MessageResponse)
async def delete_task(
    task_id: int,
    username: str,
    db: Session = Depends(get_db),
):
    """
    删除任务
    """
    user = get_or_create_user(db, username)
    task = db.query(VideoTask).filter(VideoTask.id == task_id).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # 检查权限
    if task.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")

    db.delete(task)
    db.commit()

    return MessageResponse(message="Task deleted successfully")
