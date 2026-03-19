"""
Seedance 视频生成平台 - 后端主入口
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import settings
from app.core.database import init_db
from app.services import start_task_poller, stop_task_poller
from app.api import videos_router, users_router, images_router, assets_router

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info("Starting up...")

    # 初始化数据库
    init_db()
    logger.info("Database initialized")

    # 启动任务轮询器
    start_task_poller()
    logger.info("Task poller started")

    yield

    # 清理
    logger.info("Shutting down...")
    stop_task_poller()
    logger.info("Task poller stopped")


# 创建 FastAPI 应用
app = FastAPI(
    title="Seedance Video Generation Platform",
    description="企业内部 AI 视频生成平台",
    version="1.0.0",
    lifespan=lifespan,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(videos_router)
app.include_router(users_router)
app.include_router(images_router)
app.include_router(assets_router)

# 静态文件服务
storage_path = Path(settings.STORAGE_PATH)
if storage_path.exists():
    app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")


@app.get("/")
async def root():
    """根路径"""
    return {
        "name": "Seedance Video Generation Platform",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
