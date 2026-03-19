"""
API 模块
"""
from .videos import router as videos_router
from .users import router as users_router
from .images import router as images_router

__all__ = ["videos_router", "users_router", "images_router"]
