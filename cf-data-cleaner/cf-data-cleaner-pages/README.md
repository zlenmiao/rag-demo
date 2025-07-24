# AI数据清洗工具 - Cloudflare Pages版

## 🎯 项目介绍

基于Cloudflare Pages构建的AI数据清洗工具，提供智能化数据处理和RAG知识库构建能力。

### ✅ 主要特性
- 🤖 **AI智能清洗**：支持文本和图片内容处理
- 🚀 **现代化架构**：基于Cloudflare Pages + Functions
- 🆓 **免费部署**：利用Cloudflare免费服务
- 🔧 **完整API支持**：提供RESTful API接口

## 📁 项目结构

```
cf-data-cleaner-pages/
├── public/                              # 静态文件目录
│   ├── index.html                      # 主页 ✅
│   ├── data_cleaner.html              # 数据清洗页面 ✅
│   └── data_viewer.html               # 数据查看页面 ✅
├── functions/                          # Pages Functions API
│   └── api/
│       └── data_cleaner/
│           ├── get_default_prompt.js   # 获取默认提示词 ✅
│           ├── clean_data.js          # 文本清洗API ✅
│           ├── clean_image.js         # 图片识别API ✅
│           ├── save_data.js           # 保存数据API ✅
│           ├── data_list.js           # 数据列表API ✅
│           └── data/
│               └── [id].js           # 单个数据CRUD ✅
├── wrangler.toml                      # Pages配置 ✅
├── package.json                       # 项目配置 ✅
├── DEPLOYMENT.md                      # 部署指南 ✅
└── README.md                          # 项目说明 ✅
```

## 🚀 快速部署

### 1. 准备环境
```bash
# 安装wrangler CLI (如果还没有)
npm install -g wrangler

# 登录Cloudflare
wrangler login
```

### 2. 创建项目
```bash
# 创建Pages项目
wrangler pages project create cf-data-cleaner-pages
```

### 3. 配置环境变量
```bash
# 设置必要的API密钥
wrangler secret put AI_API_KEY --env production
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_ANON_KEY --env production
wrangler secret put SUPABASE_SERVICE_KEY --env production
```

### 4. 部署
```bash
# 部署到生产环境
npm run deploy:production

# 或部署到预览环境
npm run deploy:preview
```

## 🌐 访问地址

部署完成后，你将获得：
- **Pages域名**: `https://cf-data-cleaner-pages.pages.dev`
- **自定义域名**: 可在CF Dashboard中绑定

## 🔧 API路径对比

| 功能 | Workers路径 | Pages路径 |
|------|-------------|-----------|
| 默认提示词 | `/data_cleaner/get_default_prompt` | `/api/data_cleaner/get_default_prompt` |
| 文本清洗 | `/data_cleaner/clean_data` | `/api/data_cleaner/clean_data` |
| 图片识别 | `/data_cleaner/clean_image` | `/api/data_cleaner/clean_image` |

## 📊 功能状态

### ✅ 已完成
- 静态页面托管
- 响应式UI设计
- 获取默认提示词API
- 文本清洗API（DeepSeek-V3）
- 图片识别API（DeepSeek-VL2）
- 数据保存API（Supabase）
- 数据列表API（分页查询）
- 数据编辑API（更新删除）
- 完整的CRUD操作
- 实时搜索功能
- 数据统计分析

### 🎯 计划中
- 批量操作功能
- 数据导出功能
- 更多AI模型支持
- 性能优化

## 🔄 从Workers迁移

### 数据无需迁移
- 使用相同的Supabase数据库
- 数据表结构完全一致
- 环境变量相同

### 前端路径更新
- API基础URL: `window.location.origin` → `/api`
- 自动适配当前域名

## 🎮 使用体验

### 主要功能
1. **智能数据清洗**
   - 文本语义分析
   - 自动段落切分
   - 关键词提取
   - 分类标注

2. **图片内容识别**（开发中）
   - AI视觉理解
   - 多模态处理
   - 结构化输出

3. **数据管理**（开发中）
   - 记录浏览
   - 在线编辑
   - 批量操作

### 界面特性
- 🎨 现代化UI设计
- 📱 响应式布局
- 🌙 优雅的交互体验
- 🔧 专业的功能配置

## 🌍 自定义域名（推荐）

### 1. 添加域名
在Cloudflare Dashboard中：
1. 进入 **Pages** → **cf-data-cleaner-pages**
2. 点击 **Custom domains**
3. 添加你的域名

### 2. 配置DNS
```
类型: CNAME
名称: <subdomain>
值: <project-name>.pages.dev
```

## 💡 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **UI框架**: Bootstrap 5.1.3
- **图标**: Font Awesome 6.0.0
- **后端**: Cloudflare Pages Functions
- **AI模型**: DeepSeek-V3, DeepSeek-VL2
- **数据库**: Supabase (PostgreSQL)
- **部署**: Cloudflare Pages

## 🎉 完成状态

✅ **功能完整** - 提供完整的数据清洗和管理功能
✅ **生产就绪** - 可用于生产环境部署
✅ **持续迭代** - 不断优化和新增功能

---

### 📞 使用场景

**适用于：**
- RAG知识库构建
- 文档数据预处理
- 多模态内容分析
- 企业数据清洗
- 研究项目数据管理

**技术优势：**
- 无服务器架构，免运维
- 全球CDN加速
- 弹性扩展
- 成本效益高