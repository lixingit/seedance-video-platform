"""
测试 SDK 返回结构
"""
import os
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import settings
from volcenginesdkarkruntime import Ark

print("=" * 60)
print("测试 Seedance SDK 返回结构")
print("=" * 60)

# 初始化客户端
client = Ark(
    base_url=settings.ARK_BASE_URL,
    api_key=settings.ARK_API_KEY,
)

print(f"\nBase URL: {settings.ARK_BASE_URL}")
print(f"Model: {settings.ARK_MODEL}")

# 从数据库获取成功的 task_id
from app.core.database import SessionLocal
from app.models import VideoTask

db = SessionLocal()
tasks = db.query(VideoTask).filter(VideoTask.status == 'succeeded').order_by(VideoTask.created_at.desc()).limit(2).all()
db.close()

if not tasks:
    print("\n没有找到成功的任务，请先生成一个视频任务")
    sys.exit(1)

for task in tasks:
    print(f"\n{'=' * 60}")
    print(f"查询任务: {task.ark_task_id}")
    print(f"{'=' * 60}")

    try:
        result = client.content_generation.tasks.get(task_id=task.ark_task_id)

        print(f"\n1. 类型: {type(result)}")
        print(f"\n2. 所有属性: {dir(result)}")
        print(f"\n3. __dict__:")
        if hasattr(result, '__dict__'):
            for k, v in result.__dict__.items():
                if not k.startswith('_'):
                    print(f"   {k}: {v}")

        print(f"\n4. 尝试获取 status: {getattr(result, 'status', 'NOT FOUND')}")
        print(f"5. 尝试获取 result: {getattr(result, 'result', 'NOT FOUND')}")
        print(f"6. 尝试获取 content: {getattr(result, 'content', 'NOT FOUND')}")
        print(f"7. 尝试获取 output: {getattr(result, 'output', 'NOT FOUND')}")

        # 深入查看 result 字段
        if hasattr(result, 'result') and result.result:
            print(f"\n8. result 的类型: {type(result.result)}")
            print(f"   result 的内容: {result.result}")
            if isinstance(result.result, list) and len(result.result) > 0:
                item = result.result[0]
                print(f"   第一个元素类型: {type(item)}")
                print(f"   第一个元素属性: {dir(item)}")
                if hasattr(item, '__dict__'):
                    print(f"   第一个元素 __dict__: {item.__dict__}")

    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()

print("\n" + "=" * 60)
