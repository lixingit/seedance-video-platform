"""
API Schema 定义
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


# ========== 用户相关 ==========


class UserCreate(BaseModel):
    """创建用户请求"""

    username: str = Field(..., min_length=1, max_length=100)


class UserResponse(BaseModel):
    """用户响应"""

    id: int
    username: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


# ========== 任务相关 ==========


class VideoTaskCreate(BaseModel):
    """创建视频任务请求"""

    prompt: str = Field(..., min_length=1, description="视频生成提示词")
    negative_prompt: Optional[str] = Field(None, description="负向提示词")
    duration: int = Field(4, ge=3, le=5, description="视频时长（3-5秒）")
    motion_intensity: Optional[str] = Field("standard", description="运动强度: gentle/standard/intense")
    first_frame_image: Optional[str] = Field(None, description="首帧图片（base64或URL）")
    first_frame_image_url: Optional[str] = Field(None, description="首帧图片URL")
    last_frame_image_url: Optional[str] = Field(None, description="尾帧图片URL")


class VideoTaskResponse(BaseModel):
    """视频任务响应"""

    id: int
    ark_task_id: Optional[str]
    user_id: int
    prompt: str
    negative_prompt: Optional[str]
    duration: int
    resolution: str
    motion_intensity: Optional[str]
    first_frame_image_path: Optional[str]
    first_frame_image_url: Optional[str]
    last_frame_image_url: Optional[str] = None
    last_frame_image_path: Optional[str] = None
    video_url: Optional[str]
    video_path: Optional[str]
    status: str
    error_message: Optional[str]
    tags: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

    model_config = {
        "from_attributes": True,
    }


class VideoTaskDetail(VideoTaskResponse):
    """视频任务详情（包含标签列表）"""

    tags_list: Optional[List[str]] = None


# ========== 标签相关 ==========


class TagCreate(BaseModel):
    """创建标签请求"""

    name: str = Field(..., min_length=1, max_length=100)
    color: Optional[str] = None


class TagResponse(BaseModel):
    """标签响应"""

    id: int
    name: str
    color: Optional[str]
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class UpdateTagsRequest(BaseModel):
    """更新任务标签请求"""

    tags: List[str] = Field(default_factory=list)


class UpdateNotesRequest(BaseModel):
    """更新任务备注请求"""

    notes: str = Field(default="")


# ========== 通用响应 ==========


class MessageResponse(BaseModel):
    """消息响应"""

    message: str


class ErrorResponse(BaseModel):
    """错误响应"""

    error: str
    detail: Optional[str] = None


# ========== 素材相关 ==========


class AssetResponse(BaseModel):
    """素材响应"""

    id: int
    user_id: int
    username: str = ""
    type: str
    source: str
    name: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_path: Optional[str] = None
    content: Optional[str] = None
    tags_list: Optional[List[str]] = None
    is_shared: bool = False
    related_task_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class AssetListResponse(BaseModel):
    """素材列表响应（分页）"""

    items: List[AssetResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AssetUpdate(BaseModel):
    """更新素材请求"""

    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_shared: Optional[bool] = None


class PromptTemplateCreate(BaseModel):
    """创建提示词模板请求"""

    name: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    tags: Optional[List[str]] = None


class ImageGenerateRequest(BaseModel):
    """图片生成请求"""

    prompt: str = Field(..., min_length=1)
    n: int = Field(4, ge=1, le=8)
    size: str = Field("1024x1024")


class ImageGenerateResponse(BaseModel):
    """图片生成响应"""

    images: List[AssetResponse]
    errors: List[dict] = []


class ImageUploadResponse(BaseModel):
    """图片上传响应"""

    asset_id: int
    file_url: str
    file_path: str
