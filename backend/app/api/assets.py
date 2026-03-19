"""
素材管理 API
"""
import math
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from datetime import datetime

from app.core.database import get_db
from app.models import Asset
from app.api.utils import get_or_create_user, asset_to_response
from app.api.schemas import (
    AssetResponse,
    AssetListResponse,
    AssetUpdate,
    PromptTemplateCreate,
    MessageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", response_model=AssetListResponse)
async def list_assets(
    username: str = "",
    scope: str = "my",
    type: str = "",
    source: str = "",
    keyword: str = "",
    tag: str = "",
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    """列表查询素材，支持筛选和分页"""
    if not username:
        raise HTTPException(status_code=400, detail="username is required")

    user = get_or_create_user(db, username)
    query = db.query(Asset)

    if scope == "shared":
        query = query.filter(Asset.is_shared == True)
    else:
        query = query.filter(Asset.user_id == user.id)

    if type:
        query = query.filter(Asset.type == type)

    if source:
        query = query.filter(Asset.source == source)

    if keyword:
        query = query.filter(
            or_(
                Asset.name.contains(keyword),
                Asset.description.contains(keyword),
            )
        )

    if tag:
        query = query.filter(Asset.tags.contains(f'"{tag}"'))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    assets = (
        query
        .order_by(desc(Asset.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return AssetListResponse(
        items=[asset_to_response(a) for a in assets],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: int,
    username: str = "",
    db: Session = Depends(get_db),
):
    """获取素材详情"""
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset_to_response(asset)


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: int,
    request: AssetUpdate,
    username: str = "",
    db: Session = Depends(get_db),
):
    """更新素材（仅所有者可操作）"""
    if not username:
        raise HTTPException(status_code=400, detail="username is required")

    user = get_or_create_user(db, username)
    asset = db.query(Asset).filter(Asset.id == asset_id).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if request.name is not None:
        asset.name = request.name
    if request.description is not None:
        asset.description = request.description
    if request.tags is not None:
        asset.set_tags_list(request.tags)
    if request.is_shared is not None:
        asset.is_shared = request.is_shared

    asset.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(asset)
    return asset_to_response(asset)


@router.delete("/{asset_id}", response_model=MessageResponse)
async def delete_asset(
    asset_id: int,
    username: str = "",
    db: Session = Depends(get_db),
):
    """删除素材（仅所有者可操作）"""
    if not username:
        raise HTTPException(status_code=400, detail="username is required")

    user = get_or_create_user(db, username)
    asset = db.query(Asset).filter(Asset.id == asset_id).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    db.delete(asset)
    db.commit()
    return MessageResponse(message="Asset deleted successfully")


@router.post("/prompt-template", response_model=AssetResponse)
async def create_prompt_template(
    request: PromptTemplateCreate,
    username: str = "",
    db: Session = Depends(get_db),
):
    """保存提示词模板为素材"""
    if not username:
        raise HTTPException(status_code=400, detail="username is required")

    user = get_or_create_user(db, username)

    asset = Asset(
        user_id=user.id,
        type="prompt_template",
        source="manual",
        name=request.name,
        content=request.content,
    )
    if request.tags:
        asset.set_tags_list(request.tags)

    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset_to_response(asset)
