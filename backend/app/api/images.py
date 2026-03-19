"""
图片上传和生成 API
"""
import os
import uuid
import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models import Asset
from app.api.utils import get_or_create_user, asset_to_response
from app.api.schemas import (
    ImageGenerateRequest,
    ImageGenerateResponse,
    ImageUploadResponse,
    AssetResponse,
)
from app.services import get_image_gen_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/images", tags=["images"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    username: str = "",
    db: Session = Depends(get_db),
):
    """上传图片文件，保存到 storage/images，自动创建 Asset 记录"""
    if not username:
        raise HTTPException(status_code=400, detail="username is required")

    user = get_or_create_user(db, username)

    # 校验 MIME 类型
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: jpg, png, webp"
        )

    # 读取文件内容
    content = await file.read()

    # 校验文件大小
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB")

    # 生成文件名并保存
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = settings.IMAGES_PATH / filename
    settings.IMAGES_PATH.mkdir(parents=True, exist_ok=True)

    with open(filepath, "wb") as f:
        f.write(content)

    file_url = f"/storage/images/{filename}"

    # 创建 Asset 记录
    asset = Asset(
        user_id=user.id,
        type="image",
        source="upload",
        name=file.filename or filename,
        file_path=str(filepath),
        file_url=file_url,
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    logger.info(f"Image uploaded: {file_url} (asset_id={asset.id})")

    return ImageUploadResponse(
        asset_id=asset.id,
        file_url=file_url,
        file_path=str(filepath),
    )


@router.post("/generate", response_model=ImageGenerateResponse)
async def generate_images(
    request: ImageGenerateRequest,
    username: str = "",
    db: Session = Depends(get_db),
):
    """调用文生图 API 生成图片，全部自动入素材库"""
    if not username:
        raise HTTPException(status_code=400, detail="username is required")

    user = get_or_create_user(db, username)

    image_service = get_image_gen_service()
    if not image_service.is_available():
        raise HTTPException(status_code=500, detail="Image generation service not available")

    # 在线程中运行同步的图片生成
    result = await asyncio.to_thread(
        image_service.generate_images,
        prompt=request.prompt,
        n=request.n,
        size=request.size,
    )

    # 为每张成功的图片创建 Asset 记录
    asset_responses = []
    for img in result["images"]:
        asset = Asset(
            user_id=user.id,
            type="image",
            source="ai_generated",
            name=f"AI生成-{request.prompt[:20]}",
            file_path=img["file_path"],
            file_url=img["file_url"],
        )
        asset.set_metadata({
            "generation_prompt": request.prompt,
            "size": request.size,
        })
        db.add(asset)
        db.commit()
        db.refresh(asset)
        asset_responses.append(asset_to_response(asset))

    return ImageGenerateResponse(
        images=asset_responses,
        errors=result["errors"],
    )
