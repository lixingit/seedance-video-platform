"""
用户相关 API
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User
from app.api.schemas import UserCreate, UserResponse

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserResponse)
async def create_user(request: UserCreate, db: Session = Depends(get_db)):
    """
    创建或获取用户
    """
    # 检查用户是否已存在
    user = db.query(User).filter(User.username == request.username).first()
    if user:
        return user

    # 创建新用户
    user = User(username=request.username)
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.get("/{username}", response_model=UserResponse)
async def get_user(username: str, db: Session = Depends(get_db)):
    """
    获取用户信息
    """
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
