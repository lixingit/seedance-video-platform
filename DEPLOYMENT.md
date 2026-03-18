# Seedance 视频生成平台 - 部署文档

## 目录
- [项目文档位置](#项目文档位置)
- [本地启动/停止命令](#本地启动停止命令)
- [其他 PC 部署指南](#其他-pc-部署指南)
- [生产环境部署建议](#生产环境部署建议)

---

## 项目文档位置

| 文档 | 位置 | 说明 |
|------|------|------|
| 项目 README | `README.md` | 项目介绍和快速开始 |
| 部署文档 | `DEPLOYMENT.md` | 本文档，详细部署说明 |
| API 文档 | 后端启动后访问 `/docs` | 自动生成的 Swagger API 文档 |
| 产品需求 | 产品经理提供 | 内部产品需求文档 |

---

## 本地启动/停止命令

### 前置要求
- Python 3.8+
- Node.js 16+
- npm 或 yarn

### 后端操作

#### 启动后端
```bash
cd backend

# 首次部署：安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
```

后端服务将在 http://localhost:8000 启动

#### 停止后端
```bash
# 方法 1: 在运行终端按 Ctrl+C

# 方法 2: 查找并杀掉进程
ps aux | grep "python main.py"
kill <PID>

# 或者一键杀掉
pkill -f "python main.py"
```

### 前端操作

#### 启动前端
```bash
cd frontend

# 首次部署：安装依赖
npm install

# 启动开发服务器
npm start
```

前端应用将在 http://localhost:3000 启动

#### 停止前端
```bash
# 在运行终端按 Ctrl+C
```

---

## 其他 PC 部署指南

### 方式一：直接复制项目（推荐用于内部团队）

#### 1. 准备环境
在目标机器上安装：
```bash
# 安装 Python 3.8+ (从 python.org 下载或使用包管理器)

# 安装 Node.js 16+ (从 nodejs.org 下载)
```

#### 2. 复制项目
将整个项目文件夹复制到目标机器：
```bash
# 可以使用 U 盘、网盘、或 scp 命令
scp -r seedance-video-platform user@target-pc:/path/to/
```

#### 3. 配置后端
```bash
cd seedance-video-platform/backend

# 复制环境变量配置
cp .env.example .env

# 编辑 .env 文件，填入正确的 API Key
# ARK_API_KEY=your_api_key_here
```

#### 4. 安装依赖并启动
```bash
# 后端
cd backend
pip install -r requirements.txt
python main.py

# 前端（新开终端）
cd frontend
npm install
npm start
```

---

### 方式二：使用 Git 部署

#### 1. 初始化 Git 仓库（如果还没有）
```bash
cd seedance-video-platform
git init
git add .
git commit -m "Initial commit"
```

#### 2. 推送到 Git 服务器（GitHub/GitLab/Gitee 等）
```bash
git remote add origin <your-repo-url>
git push -u origin main
```

#### 3. 在目标机器上克隆
```bash
git clone <your-repo-url>
cd seedance-video-platform

# 后续步骤同方式一
```

---

### 方式三：Docker 部署（推荐用于生产环境）

#### 创建后端 Dockerfile
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "main.py"]
```

#### 创建前端 Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 创建 docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - ARK_API_KEY=${ARK_API_KEY}
    volumes:
      - ./backend/data:/app/data
      - ./backend/storage:/app/storage

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
```

#### 启动服务
```bash
docker-compose up -d
```

---

## 生产环境部署建议

### 1. 后端部署建议

- 使用 Gunicorn + Uvicorn 代替直接运行 `python main.py`
```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

- 使用 Supervisor 或 systemd 管理进程
- 配置 Nginx 反向代理
- 启用 HTTPS

### 2. 前端部署建议

- 构建生产版本：`npm run build`
- 使用 Nginx 或 CDN 托管静态文件
- 配置 API 代理

### 3. 数据备份

- 定期备份 `backend/data/app.db` SQLite 数据库
- 建议每日备份，保留 7 天历史

### 4. 安全建议

- 不要将 `.env` 文件提交到 Git
- 定期更换 API Key
- 限制访问 IP（如果是内部使用）
- 配置用户认证（当前版本使用简单用户名，生产环境建议接入 SSO）

---

## 常见问题

### Q: 后端启动失败，提示模块缺失
A: 运行 `pip install -r requirements.txt` 重新安装依赖

### Q: 前端无法连接后端 API
A: 检查 `frontend/vite.config.js` 中的代理配置，确保后端地址正确

### Q: 视频生成失败
A: 检查 `.env` 中的 `ARK_API_KEY` 是否正确，确认账户余额充足

### Q: 如何迁移数据到新机器
A: 复制 `backend/data/app.db` 文件到新机器相同位置即可

---

## 技术支持

如遇问题，请检查：
1. 后端日志：终端输出
2. 前端日志：浏览器开发者工具 Console
3. API 文档：http://localhost:8000/docs
