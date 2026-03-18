"""
Seedance SDK 封装服务
"""
import os
import time
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

# 尝试导入 SDK
try:
    from volcenginesdkarkruntime import Ark

    ARK_AVAILABLE = True
except ImportError:
    ARK_AVAILABLE = False
    logger.warning("volcengine-python-sdk[ark] not available")


class SeedanceService:
    """Seedance 视频生成服务"""

    def __init__(self):
        self.client = None
        if ARK_AVAILABLE and settings.ARK_API_KEY:
            try:
                self.client = Ark(
                    base_url=settings.ARK_BASE_URL,
                    api_key=settings.ARK_API_KEY,
                )
                logger.info("Seedance client initialized")
            except Exception as e:
                    logger.error(f"Failed to initialize Seedance client: {e}")

    def is_available(self) -> bool:
        """检查服务是否可用"""
        return self.client is not None

    def create_video_task(
        self,
        prompt: str,
        duration: int = 4,
        camera_fixed: bool = False,
        watermark: bool = True,
        first_frame_url: Optional[str] = None,
        negative_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        创建视频生成任务

        Args:
            prompt: 提示词
        duration: 视频时长（秒）
        camera_fixed: 相机是否固定
        watermark: 是否添加水印
        first_frame_url: 首帧图片 URL（可选）
        negative_prompt: 负向提示词（可选）

        Returns:
            任务信息
        """
        if not self.client:
            raise RuntimeError("Seedance client not initialized")

        # 构建提示词，添加参数
        prompt_with_params = prompt
        prompt_with_params += f" --duration {duration}"
        prompt_with_params += f" --camerafixed {str(camera_fixed).lower()}"
        prompt_with_params += f" --watermark {str(watermark).lower()}"

        if negative_prompt:
            # TODO: 确认负向提示词如何传递
            pass

        # 构建内容
        content = [
            {
                "type": "text",
                "text": prompt_with_params,
            }
        ]

        # 添加首帧图片
        if first_frame_url:
            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": first_frame_url,
                    },
                }
            )

        logger.info(f"Creating video task with prompt: {prompt[:50]}...")

        create_result = self.client.content_generation.tasks.create(
            model=settings.ARK_MODEL,
            content=content,
        )

        # 获取任务ID
        task_id = create_result.id

        logger.info(f"Task created: {task_id}")

        return {
            "task_id": task_id,
            "status": "queued",
            "raw_result": create_result,
        }

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        获取任务状态"""
        if not self.client:
            raise RuntimeError("Seedance client not initialized")

        result = self.client.content_generation.tasks.get(task_id=task_id)

        # 获取状态
        status = getattr(result, 'status', 'unknown')

        # 获取错误
        error = getattr(result, 'error', None)

        return {
            "task_id": task_id,
            "status": status,
            "video_url": self._extract_video_url(result),
            "error": error,
            "raw_result": result,
        }

    def _extract_video_url(self, result) -> Optional[str]:
        """从结果中提取视频 URL"""
        try:
            # 视频 URL 在 content.video_url 中
            if hasattr(result, "content") and result.content:
                if hasattr(result.content, "video_url"):
                    return result.content.video_url

        except Exception as e:
            logger.warning(f"Failed to extract video URL: {e}")
        return None

    def poll_task_until_complete(
        self,
        task_id: str,
        poll_interval: int = 3,
        timeout: int = 300,
    ) -> Dict[str, Any]:
        """
        轮询任务直到完成

        Args:
            task_id: 任务 ID
            poll_interval: 轮询间隔（秒）
            timeout: 超时时间（秒）

        Returns:
            最终任务结果
        """
        start_time = time.time()

        while True:
            elapsed = time.time() - start_time
            if elapsed > timeout:
                raise TimeoutError(f"Task timeout after {timeout} seconds")

            status_result = self.get_task_status(task_id)
            status = status_result["status"]

            if status == "succeeded":
                logger.info(f"Task {task_id} succeeded")
                return status_result
            elif status == "failed":
                logger.error(f"Task {task_id} failed: {status_result.get('error')}")
                return status_result

            logger.info(f"Task {task_id} status: {status}, waiting...")
            time.sleep(poll_interval)


# 全局服务实例
_seedance_service: Optional[SeedanceService] = None


def get_seedance_service() -> SeedanceService:
    """获取 Seedance 服务实例"""
    global _seedance_service
    if _seedance_service is None:
        _seedance_service = SeedanceService()
    return _seedance_service
