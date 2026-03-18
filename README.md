# Seedance 视频生成平台

企业内部 AI 视频生成平台，基于火山引擎 Seedance 1.5 Pro。

## 功能特性

- ✅ 文生视频（支持 3/4/5 秒时长）
- ✅ 预设提示词模板
- ✅ 任务列表（我的生成 / 全部团队）
- ✅ 自动刷新任务状态（每3秒）
- ✅ 标签管理
- ✅ 备注功能
- ✅ 视频预览与下载

## 技术栈

- **后端**: FastAPI + SQLite
- **前端**: React 18 + Ant Design 5 + Vite
- **AI**: 火山引擎 Seedance 1.5 Pro

## 项目结构

```
seedance-video-platform/
├── backend/                 # 后端服务
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── models/         # 数据库模型
│   │   ├── services/       # 业务逻辑
│   │   └── core/           # 配置和数据库
│   ├── data/               # SQLite 数据文件
│   ├── storage/            # 本地存储（图片、视频）
│   ├── main.py             # 后端入口
│   └── requirements.txt
├── frontend/                # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API 服务
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── README.md                # 本文档
└── DEPLOYMENT.md            # 详细部署文档
```

## 快速开始

### 1. 配置环境

后端已预置 API Key，如需修改请编辑 `backend/.env`：

```env
ARK_API_KEY=your_api_key_here
```

### 2. 启动后端

```bash
cd backend

# 首次运行：安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
```

后端服务将在 http://localhost:8000 启动

**停止后端**: 在终端按 `Ctrl+C`，或运行 `pkill -f "python main.py"`

### 3. 启动前端

打开新的终端窗口：

```bash
cd frontend

# 首次运行：安装依赖
npm install

# 启动服务
npm start
```

前端应用将在 http://localhost:3000 启动

**停止前端**: 在终端按 `Ctrl+C`

## 常用命令速查

| 操作 | 命令 |
|------|------|
| 启动后端 | `cd backend && python main.py` |
| 停止后端 | `pkill -f "python main.py"` |
| 启动前端 | `cd frontend && npm start` |
| 停止前端 | `Ctrl+C` (在前端终端) |

## 使用说明

1. 打开浏览器访问 http://localhost:3000
2. 输入用户名登录
3. 在生成页面输入提示词，点击"生成视频"
4. 在历史记录页面查看生成进度和结果

## 查看视频

- 进入"历史记录"页面
- 点击成功任务的"详情"按钮
- 在弹窗中播放或下载视频

## API 文档

后端启动后，访问 http://localhost:8000/docs 查看自动生成的 API 文档。

## 部署到其他 PC

详细部署说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)，包含：
- 环境准备
- 依赖安装
- 三种部署方式（直接复制、Git、Docker）
- 生产环境建议

## 预设提示词模板

- **产品展示**: `[产品]在[场景]中，[运动方式]，[光线/氛围]`
- **人物动作**: `[人物描述]正在[动作]，[服装/表情]，[背景]`
- **风景空镜**: `[场景]的[时间/天气]，[运动方式]，[景别]`
- **抽象概念**: `[风格]风格的[主体]，[色彩基调]，[氛围感]`

## 预置标签

成片可用、测试、需优化、参考案例、产品素材、空镜
