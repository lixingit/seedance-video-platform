# Seedance 视频生成平台 V2 功能设计

## 概述

在现有平台基础上新增三大功能：
1. 视频生成时首帧/尾帧图片入口（可选上传）
2. 基于提示词 AI 生成备选图片供选择
3. 历史素材管理（图片、视频、提示词模板）

**设计方向**：生成页面驱动。图片上传和 AI 生成都在生成页面完成并同步存入素材库，素材库用于浏览和复用历史素材。

## 功能一：首帧/尾帧图片

### 用户交互

生成页面新增两个并列的图片选择区域（首帧、尾帧），每个区域提供三种输入方式：

1. **上传图片** — 本地选择文件，支持 jpg/png/webp，限制 10MB，服务端校验 MIME 类型和文件大小
2. **从素材库选** — 弹窗展示素材库中的图片素材，点击选用
3. **AI 生成备选** — 弹出 Modal，基于提示词生成 4 张图片，选择一张填入

所有图片均可选，不填则退化为纯文生视频。

### 生成页面布局

```
┌─────────────────────────────────────────────┐
│  提示词输入区                                  │
│  [提示词 TextArea]  [预设模板下拉]              │
├─────────────────────────────────────────────┤
│  首帧图片（可选）           尾帧图片（可选）      │
│  ┌─────────────┐       ┌─────────────┐      │
│  │  上传图片    │       │  上传图片    │      │
│  │  从素材库选  │       │  从素材库选  │      │
│  │  AI生成备选  │       │  AI生成备选  │      │
│  └─────────────┘       └─────────────┘      │
├─────────────────────────────────────────────┤
│  参数设置                                     │
│  时长: [3/4/5秒]  运动强度: [柔和/标准/强烈]    │
│  反向提示词（高级选项折叠）                      │
├─────────────────────────────────────────────┤
│              [ 生成视频 ]                      │
└─────────────────────────────────────────────┘
```

### AI 生成备选图片交互流程

1. 用户点"AI 生成备选"按钮
2. 弹出 Modal，显示当前提示词（可微调为图片专用提示词）
3. 点"生成"，显示 loading
4. 返回 4 张图片，2x2 网格展示
5. 用户点选一张，自动填入对应的首帧/尾帧位置
6. 所有 4 张生成的图片自动存入素材库

### 后端改动

**VideoTask 模型变更**：

`first_frame_image_path` 和 `first_frame_image_url` 已存在于现有模型中，无需新增。仅新增尾帧字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `last_frame_image_url` | String(500) | 尾帧图片 URL |
| `last_frame_image_path` | String(500) | 尾帧图片本地路径 |

**数据库迁移**：现有 SQLite 使用 `Base.metadata.create_all()` 只能创建新表，无法自动添加列。需手动执行：

```sql
ALTER TABLE video_tasks ADD COLUMN last_frame_image_url VARCHAR(500);
ALTER TABLE video_tasks ADD COLUMN last_frame_image_path VARCHAR(500);
```

在 `database.py` 的 `init_db()` 中增加迁移逻辑：检测列是否存在，不存在则 ALTER TABLE 添加。

**Seedance 服务改动**：

`seedance.py` 的 `create_video_task` 新增 `last_frame_url` 参数。首帧和尾帧统一使用 `position` 字段区分：

```python
if first_frame_url:
    content.append({
        "type": "image_url",
        "image_url": {"url": first_frame_url, "position": "first_frame"}
    })
if last_frame_url:
    content.append({
        "type": "image_url",
        "image_url": {"url": last_frame_url, "position": "last_frame"}
    })
```

具体参数格式以火山引擎 Seedance API 文档为准，实施时需验证。

**API Schema 改动**：

- `VideoTaskCreate` 新增 `last_frame_image_url: Optional[str]`
- `VideoTaskResponse` 新增 `last_frame_image_url: Optional[str]` 和 `last_frame_image_path: Optional[str]`

## 功能二：AI 图片生成

### 技术方案

使用火山引擎 `doubao-seedream-4-0-250828` 模型，通过 `client.images.generate()` 同步调用。

### 图片生成服务

新增 `backend/app/services/image_gen.py`：

```python
import uuid
import httpx
from volcenginesdkarkruntime import Ark
from app.core.config import settings

class ImageGenService:
    """火山引擎文生图服务"""

    def __init__(self):
        self.client = Ark(
            base_url=settings.ARK_BASE_URL,
            api_key=settings.ARK_API_KEY,
        )
        self.model = settings.ARK_IMAGE_MODEL

    def generate_images(self, prompt: str, n: int = 4, size: str = "1024x1024"):
        """
        同步生成 n 张备选图片。
        由 FastAPI 端点通过 asyncio.to_thread() 调用以避免阻塞事件循环。
        部分失败时返回已成功的图片，errors 中记录失败信息。
        """
        results = []
        errors = []
        for i in range(n):
            try:
                response = self.client.images.generate(
                    model=self.model,
                    prompt=prompt,
                    response_format="url",
                    size=size,
                    sequential_image_generation="disabled",
                    stream=False,
                    watermark=True
                )
                url = response.data[0].url
                local_path = self._download_and_save(url)
                file_url = f"/storage/images/{os.path.basename(local_path)}"
                results.append({
                    "file_url": file_url,
                    "file_path": local_path
                })
            except Exception as e:
                errors.append({"index": i, "error": str(e)})
        return {"images": results, "errors": errors}

    def _download_and_save(self, url: str) -> str:
        """
        下载远程图片到本地 storage/images/。
        文件命名：{uuid}.png
        返回本地文件路径（相对于 storage 目录）。
        """
        filename = f"{uuid.uuid4()}.png"
        filepath = settings.IMAGES_PATH / filename
        resp = httpx.get(url)
        resp.raise_for_status()
        with open(filepath, "wb") as f:
            f.write(resp.content)
        return str(filepath)
```

### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/images/upload` | 上传图片文件，保存到 storage/images，自动创建 Asset 记录 |
| `POST` | `/api/images/generate` | 调用文生图 API 生成 4 张图片，全部自动入素材库 |

所有端点遵循现有认证模式，通过 `username` 查询参数识别用户，使用共享的 `get_or_create_user(db, username)` 工具函数。

**`POST /api/images/upload`**：
- 接收：multipart/form-data（file），查询参数 `username`
- 服务端校验：MIME 类型（image/jpeg, image/png, image/webp）+ 文件大小（<=10MB）
- 返回：`{ asset_id: int, file_url: str, file_path: str }`

**`POST /api/images/generate`**：
- 接收：`{ prompt: str, n: int = 4, size: str = "1024x1024" }`，查询参数 `username`
- 通过 `asyncio.to_thread()` 调用同步的 `ImageGenService.generate_images()`
- 返回：`{ images: [{ asset_id: int, file_url: str, file_path: str }], errors: [{ index: int, error: str }] }`
- 每张成功的图片自动创建 Asset 记录（type=image, source=ai_generated）
- 部分失败时返回已成功的图片和错误信息

### 配置新增（.env）

```env
ARK_IMAGE_MODEL=doubao-seedream-4-0-250828
```

`config.py` 对应新增 `ARK_IMAGE_MODEL: str` 配置项。

## 功能三：素材库管理

### 素材数据模型

新增 `backend/app/models/asset.py`：

```python
class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String(20))          # image / video / prompt_template
    source = Column(String(20))        # upload / ai_generated / video_generated / manual
    name = Column(String(255))         # 素材名称
    description = Column(Text)         # 备注
    file_path = Column(String(500))    # 本地文件路径（图片/视频）
    file_url = Column(String(500))     # 访问 URL（如 /storage/images/xxx.png）
    content = Column(Text)             # 提示词模板文本内容（仅 prompt_template 类型）
    metadata = Column(Text)            # JSON，结构见下方定义
    tags = Column(Text)                # JSON 数组（与 VideoTask.tags 一致的模式）
    is_shared = Column(Boolean, default=False)  # 是否团队共享
    related_task_id = Column(Integer, ForeignKey("video_tasks.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
```

需在 `backend/app/models/__init__.py` 中导出 Asset 模型。

**metadata JSON 结构定义**：

```python
# type=image 时：
{"width": 1024, "height": 1024, "format": "png", "generation_prompt": "..."}

# type=video 时：
{"duration": 4, "resolution": "720p", "prompt": "原始生成提示词"}

# type=prompt_template 时：
{"category": "产品展示"}  # 可选的模板分类
```

**共享规则**：
- 任何用户可将自己的素材设为 `is_shared=True`
- 共享素材对团队所有人可见，但仅所有者可编辑/删除
- 删除已共享的素材直接删除（不做软删除，保持简单）

### Pydantic Schemas

```python
# 请求
class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_shared: Optional[bool] = None

class PromptTemplateCreate(BaseModel):
    name: str
    content: str
    tags: Optional[List[str]] = None

class ImageGenerateRequest(BaseModel):
    prompt: str
    n: int = 4
    size: str = "1024x1024"

# 响应
class AssetResponse(BaseModel):
    id: int
    user_id: int
    username: str
    type: str
    source: str
    name: Optional[str]
    description: Optional[str]
    file_url: Optional[str]
    content: Optional[str]
    tags_list: Optional[List[str]]
    is_shared: bool
    created_at: datetime
    updated_at: datetime

class AssetListResponse(BaseModel):
    items: List[AssetResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class ImageGenerateResponse(BaseModel):
    images: List[AssetResponse]
    errors: List[dict]
```

### 素材 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/assets` | 列表查询，支持 type/source/tag/is_shared/keyword 筛选 + 分页 |
| `GET` | `/api/assets/{id}` | 素材详情 |
| `PUT` | `/api/assets/{id}` | 更新名称/标签/备注/共享状态（仅所有者可操作） |
| `DELETE` | `/api/assets/{id}` | 删除素材（仅所有者可操作） |
| `POST` | `/api/assets/prompt-template` | 保存提示词模板为素材 |

所有端点使用 `username` 查询参数，通过 `get_or_create_user(db, username)` 解析用户。

**`GET /api/assets` 查询参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| `username` | str | 用户名 |
| `scope` | str | `my` / `shared`，默认 `my` |
| `type` | str | `image` / `video` / `prompt_template`，可选 |
| `source` | str | `upload` / `ai_generated` / `video_generated` / `manual`，可选 |
| `keyword` | str | 搜索名称和描述 |
| `tag` | str | 按标签筛选 |
| `page` | int | 页码，默认 1 |
| `page_size` | int | 每页条数，默认 20 |

### 素材自动入库规则

| 触发场景 | type | source | 说明 |
|----------|------|--------|------|
| 上传首帧/尾帧图片 | image | upload | 上传时自动入库 |
| AI 生成备选图片 | image | ai_generated | 4 张全部入库（不只被选中的） |
| 视频生成成功 | video | video_generated | task_queue 回调时自动入库 |
| 手动保存提示词 | prompt_template | manual | 用户主动保存 |

### 素材库前端页面

新增 `frontend/src/pages/Assets.jsx`，导航栏新增"素材库"入口。

```
┌──────────────────────────────────────────────────┐
│  [我的素材]  [团队共享]           🔍搜索  [上传]   │
├──────────────────────────────────────────────────┤
│  筛选: [全部▼] [图片/视频/提示词模板▼] [标签▼]     │
├──────────────────────────────────────────────────┤
│  网格展示素材卡片                                  │
│  - 图片素材：缩略图                               │
│  - 视频素材：视频首帧截图 + 播放图标               │
│  - 提示词模板：文字图标 + 模板预览                 │
│  卡片底部：名称、标签、共享状态                    │
├──────────────────────────────────────────────────┤
│  分页: < 1 2 3 ... >                             │
└──────────────────────────────────────────────────┘
```

**素材操作**：
- 查看详情（大图预览 / 视频播放 / 模板内容）
- 编辑（名称、标签、备注）
- 共享/取消共享
- 删除
- 图片素材可一键"用作首帧/用作尾帧"跳转到生成页

### 从素材库选图弹窗

生成页面点"从素材库选"时弹出 Modal：
- 仅展示图片类型素材
- 支持搜索和筛选
- 包含"我的素材"和"团队共享"两个 Tab
- 点击选中后关闭弹窗，图片填入对应位置

## 共享工具函数

将 `videos.py` 中的 `get_or_create_user(db, username)` 提取到 `backend/app/api/utils.py`，供 images.py 和 assets.py 复用。

## 新增文件清单

### 后端

| 文件 | 说明 |
|------|------|
| `backend/app/services/image_gen.py` | 火山引擎文生图服务 |
| `backend/app/api/images.py` | 图片上传和生成 API |
| `backend/app/api/assets.py` | 素材管理 API |
| `backend/app/api/utils.py` | 共享工具函数（get_or_create_user 等） |
| `backend/app/models/asset.py` | Asset 数据模型 |

### 前端

| 文件 | 说明 |
|------|------|
| `frontend/src/pages/Assets.jsx` | 素材库页面 |
| `frontend/src/components/ImageGenerateModal.jsx` | AI 生成备选图片弹窗 |
| `frontend/src/components/AssetPickerModal.jsx` | 从素材库选图弹窗 |
| `frontend/src/components/FrameUpload.jsx` | 首帧/尾帧图片上传组件 |

### 修改文件清单

| 文件 | 改动 |
|------|------|
| `backend/app/core/config.py` | 新增 ARK_IMAGE_MODEL 配置 |
| `backend/app/core/database.py` | init_db 中增加 ALTER TABLE 迁移逻辑 |
| `backend/app/models/task.py` | 新增 last_frame_image_url, last_frame_image_path |
| `backend/app/models/__init__.py` | 导出 Asset 模型 |
| `backend/app/api/schemas.py` | 新增 Asset/Image 相关 schema，VideoTask schema 增加 last_frame 字段 |
| `backend/app/api/videos.py` | 视频生成成功后自动创建 Asset；移除 get_or_create_user 到 utils.py |
| `backend/app/services/seedance.py` | 支持 last_frame_url 参数，first_frame 增加 position 字段 |
| `backend/app/services/__init__.py` | 导出 ImageGenService |
| `backend/main.py` | 注册新路由（images, assets） |
| `backend/.env` | 新增 ARK_IMAGE_MODEL |
| `frontend/src/pages/Generate.jsx` | 首帧/尾帧图片区域，引用新组件 |
| `frontend/src/pages/History.jsx` | 展示首帧/尾帧缩略图 |
| `frontend/src/pages/index.js` | 导出 Assets 页面 |
| `frontend/src/services/api.js` | 新增图片上传/生成和素材 CRUD 的 API 调用 |
| `frontend/src/App.jsx` | 新增素材库路由 |

## 实施顺序

1. **Phase 1**：后端基础设施 — Asset 模型 + 迁移、共享工具函数、图片上传端点、图片生成服务
2. **Phase 2**：生成页面改造 — FrameUpload 组件、首帧/尾帧上传、ImageGenerateModal 弹窗
3. **Phase 3**：素材库 — 后端 CRUD API + Assets.jsx 前端页面
4. **Phase 4**：联动集成 — AssetPickerModal 从素材库选图、视频自动入库、提示词模板保存
