"""
共享工具函数
"""
from sqlalchemy.orm import Session
from app.models import User


def get_or_create_user(db: Session, username: str) -> User:
    """获取或创建用户"""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = User(username=username)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def asset_to_response(asset) -> dict:
    """Convert Asset model to AssetResponse-compatible dict.
    Imported by images.py and assets.py to avoid duplication."""
    from app.api.schemas import AssetResponse
    username = asset.user.username if asset.user else ""
    return AssetResponse(
        id=asset.id,
        user_id=asset.user_id,
        username=username,
        type=asset.type,
        source=asset.source,
        name=asset.name,
        description=asset.description,
        file_url=asset.file_url,
        file_path=asset.file_path,
        content=asset.content,
        tags_list=asset.get_tags_list(),
        is_shared=asset.is_shared,
        related_task_id=asset.related_task_id,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )
