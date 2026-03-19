"""
火山引擎文生图服务
"""
import os
import uuid
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from volcenginesdkarkruntime import Ark
    ARK_AVAILABLE = True
except ImportError:
    ARK_AVAILABLE = False
    logger.warning("volcengine-python-sdk[ark] not available for image gen")


class ImageGenService:
    """火山引擎文生图服务"""

    def __init__(self):
        self.client = None
        if ARK_AVAILABLE and settings.ARK_API_KEY:
            try:
                self.client = Ark(
                    base_url=settings.ARK_BASE_URL,
                    api_key=settings.ARK_API_KEY,
                )
                logger.info("ImageGenService client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize ImageGenService client: {e}")

    def is_available(self) -> bool:
        return self.client is not None

    def generate_images(self, prompt: str, n: int = 4, size: str = "1024x1024") -> dict:
        """
        同步生成 n 张备选图片。
        由 FastAPI 端点通过 asyncio.to_thread() 调用以避免阻塞事件循环。
        部分失败时返回已成功的图片，errors 中记录失败信息。
        """
        if not self.client:
            raise RuntimeError("ImageGenService client not initialized")

        results = []
        errors = []

        for i in range(n):
            try:
                response = self.client.images.generate(
                    model=settings.ARK_IMAGE_MODEL,
                    prompt=prompt,
                    response_format="url",
                    size=size,
                    sequential_image_generation="disabled",
                    stream=False,
                    watermark=True,
                )
                remote_url = response.data[0].url
                local_path = self._download_and_save(remote_url)
                filename = os.path.basename(local_path)
                file_url = f"/storage/images/{filename}"
                results.append({
                    "file_url": file_url,
                    "file_path": local_path,
                })
            except Exception as e:
                logger.error(f"Image generation {i} failed: {e}")
                errors.append({"index": i, "error": str(e)})

        return {"images": results, "errors": errors}

    def _download_and_save(self, url: str) -> str:
        """
        下载远程图片到本地 storage/images/。
        文件命名：{uuid}.png
        返回本地文件绝对路径。
        """
        filename = f"{uuid.uuid4()}.png"
        filepath = settings.IMAGES_PATH / filename

        # 确保目录存在
        settings.IMAGES_PATH.mkdir(parents=True, exist_ok=True)

        resp = httpx.get(url, timeout=60)
        resp.raise_for_status()
        with open(filepath, "wb") as f:
            f.write(resp.content)

        logger.info(f"Image saved to {filepath}")
        return str(filepath)


# 全局服务实例
_image_gen_service: Optional[ImageGenService] = None


def get_image_gen_service() -> ImageGenService:
    """获取图片生成服务实例"""
    global _image_gen_service
    if _image_gen_service is None:
        _image_gen_service = ImageGenService()
    return _image_gen_service
