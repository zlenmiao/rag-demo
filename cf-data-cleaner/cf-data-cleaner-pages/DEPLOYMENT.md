# Cloudflare Pages 部署指南

## 🎯 项目介绍

基于Cloudflare Pages的AI数据清洗工具，提供完整的数据处理和管理功能。

## 🚀 快速部署

### 1. 初始化Pages项目

```bash
# 进入Pages目录
cd cf-data-cleaner-pages

# 创建Pages项目
wrangler pages project create cf-data-cleaner-pages
```

### 2. 配置环境变量

```bash
# 设置生产环境密钥
wrangler secret put AI_API_KEY --env production
wrangler secret put SUPABASE_URL --env production
wrangler secret put SUPABASE_ANON_KEY --env production
wrangler secret put SUPABASE_SERVICE_KEY --env production
```

### 3. 部署到Pages

```bash
# 部署到生产环境
wrangler pages deploy public --project-name cf-data-cleaner-pages

# 或部署到预览环境
wrangler pages deploy public --project-name cf-data-cleaner-pages --env preview
```

## 📁 项目结构

```
cf-data-cleaner-pages/
├── public/                              # 静态文件目录
│   ├── index.html                      # 主页
│   ├── data_cleaner.html              # 数据清洗页面
│   └── data_viewer.html               # 数据查看页面（待创建）
├── functions/                          # Pages Functions (API)
│   └── api/
│       └── data_cleaner/
│           ├── get_default_prompt.js   # 获取默认提示词
│           ├── clean_data.js          # 文本清洗API
│           ├── clean_image.js         # 图片识别API ✅
│           ├── save_data.js           # 保存数据API ✅
│           ├── data_list.js           # 数据列表API ✅
│           └── data/
│               └── [id].js           # 单个数据CRUD ✅
├── wrangler.toml                      # Pages配置
└── DEPLOYMENT.md                      # 部署指南
```

## 🔧 API路径变更

### Workers版本 → Pages版本

| 功能 | Workers路径 | Pages路径 |
|------|-------------|-----------|
| 默认提示词 | `/data_cleaner/get_default_prompt` | `/api/data_cleaner/get_default_prompt` |
| 文本清洗 | `/data_cleaner/clean_data` | `/api/data_cleaner/clean_data` |
| 图片识别 | `/data_cleaner/clean_image` | `/api/data_cleaner/clean_image` |
| 保存数据 | `/data_cleaner/save_data` | `/api/data_cleaner/save_data` |
| 数据列表 | `/data_cleaner/data_list` | `/api/data_cleaner/data_list` |

## 🌐 自定义域名（推荐）

### 1. 添加自定义域名

在Cloudflare Dashboard中：
1. 进入 **Pages** → **你的项目**
2. 点击 **Custom domains**
3. 添加你的域名（如：`data-cleaner.your-domain.com`）

### 2. 配置DNS

在你的域名DNS设置中：
```
类型: CNAME
名称: data-cleaner
值: cf-data-cleaner-pages.pages.dev
```

## 🧪 测试部署

部署完成后，访问以下URL测试：

- **主页**: `https://your-project.pages.dev/`
- **数据清洗**: `https://your-project.pages.dev/data_cleaner.html`
- **API测试**: `https://your-project.pages.dev/api/data_cleaner/get_default_prompt`

## 🔄 从Workers迁移

1. **数据库无需更改** - 继续使用相同的Supabase数据库
2. **环境变量迁移** - 使用 `wrangler secret` 设置相同的密钥
3. **域名更新** - 更新前端API调用路径为Pages路径

## 💡 优势对比

### Pages vs Workers

| 特性 | Pages | Workers |
|------|-------|---------|
| 静态文件托管 | ✅ 原生支持 | ❌ 需内联 |
| 自定义域名 | ✅ 免费 | ✅ 免费 |
| Functions支持 | ✅ 完整 | ✅ 完整 |
| 部署复杂度 | 📝 中等 | 📝 简单 |
| 项目结构 | ✅ 更清晰 | 📝 集中式 |

## 🎉 完成

部署完成后，你将拥有一个功能完整的AI数据清洗工具！

### 访问地址示例
- **Pages域名**: `https://your-project.pages.dev`
- **自定义域名**: `https://your-domain.com`

📞 如有问题，请检查：
1. 环境变量是否正确设置
2. 数据库连接是否正常
3. API路径是否更新
4. Functions部署是否成功