"""
数据库连接和会话管理
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from .config import settings

# 创建数据库引擎
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基类
Base = declarative_base()


def get_db():
    """获取数据库会话的依赖项"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """初始化数据库表"""
    Base.metadata.create_all(bind=engine)
    _run_migrations()


def _run_migrations():
    """运行数据库迁移（为已存在的表添加新列）"""
    import sqlite3
    from .config import settings

    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if not db_path or not __import__("os").path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 获取 video_tasks 表的现有列
    cursor.execute("PRAGMA table_info(video_tasks)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    migrations = [
        ("last_frame_image_url", "ALTER TABLE video_tasks ADD COLUMN last_frame_image_url VARCHAR(500)"),
        ("last_frame_image_path", "ALTER TABLE video_tasks ADD COLUMN last_frame_image_path VARCHAR(500)"),
    ]

    for col_name, sql in migrations:
        if col_name not in existing_columns:
            cursor.execute(sql)

    conn.commit()
    conn.close()
