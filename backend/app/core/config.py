"""
配置管理
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


class Settings(BaseSettings):
    """应用配置"""

    # API 配置
    ARK_API_KEY: str = os.getenv("ARK_API_KEY", "")
    ARK_BASE_URL: str = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
    ARK_MODEL: str = os.getenv("ARK_MODEL", "doubao-seedance-1-5-pro-251215")
    ARK_IMAGE_MODEL: str = os.getenv("ARK_IMAGE_MODEL", "doubao-seedream-4-0-250828")

    # 服务器配置
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # 存储配置
    BASE_DIR: Path = Path(__file__).parent.parent.parent
    STORAGE_PATH: Path = BASE_DIR / os.getenv("STORAGE_PATH", "storage")
    IMAGES_PATH: Path = STORAGE_PATH / "images"
    VIDEOS_PATH: Path = STORAGE_PATH / "videos"

    # 数据库配置
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./data/app.db")

    # 任务轮询配置
    TASK_POLL_INTERVAL: int = 3  # 秒
    TASK_TIMEOUT: int = 300  # 秒（5分钟超时）

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
    }

    def __post_init__(self):
        """创建必要的目录"""
        self.IMAGES_PATH.mkdir(parents=True, exist_ok=True)
        self.VIDEOS_PATH.mkdir(parents=True, exist_ok=True)
        (self.BASE_DIR / "data").mkdir(parents=True, exist_ok=True)


# 全局配置实例
settings = Settings()
