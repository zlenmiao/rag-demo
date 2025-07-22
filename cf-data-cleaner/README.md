# CF Data Cleaner - AI数据清洗工具

基于 Cloudflare Workers 的智能数据清洗工具，支持将原始文本通过 AI 清洗为结构化数据并保存到 Supabase 数据库。

## 🚀 功能特性

- ✅ **智能文本清洗**：通过 AI 将原始文本转换为结构化数据
- ✅ **段落智能切分**：根据语义逻辑自动切分文本段落
- ✅ **关键词提取**：自动提取段落关键词和分类
- ✅ **数据库存储**：使用 Supabase PostgreSQL 存储清洗结果
- ✅ **可视化管理**：Web 界面查看、编辑、删除数据
- ✅ **无服务器部署**：基于 Cloudflare Workers，零运维成本

## 📋 项目结构

```
cf-data-cleaner/
├── src/
│   └── index.js          # Worker 主入口文件
├── public/
│   ├── data_cleaner.html # 数据清洗页面
│   └── data_viewer.html  # 数据查看页面
├── package.json          # 依赖配置
├── wrangler.toml         # CF Workers 配置
└── README.md             # 部署指南
```

## 🛠️ 部署步骤

### 1. 环境准备

```bash
# 安装 Node.js 和 pnpm
npm install -g pnpm
npm install -g wrangler

# 克隆项目
git clone <your-repo>
cd cf-data-cleaner

# 安装依赖
pnpm install
```

### 2. Cloudflare 配置

```bash
# 登录 Cloudflare
wrangler auth login

# 初始化项目（如果需要）
wrangler init
```

### 3. 环境变量配置

设置必要的环境变量：

```bash
# AI API 密钥（DeepSeek/OpenAI等）
wrangler secret put AI_API_KEY

# Supabase 数据库配置
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_KEY
```

### 4. Supabase 数据库表创建

在 Supabase 控制台中执行以下 SQL：

```sql
-- 创建清洗数据表
CREATE TABLE IF NOT EXISTS cleaned_data (
    id SERIAL PRIMARY KEY,
    original_text TEXT NOT NULL,
    cleaned_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_cleaned_data_created_at ON cleaned_data(created_at DESC);
CREATE INDEX idx_cleaned_data_original_text ON cleaned_data USING gin(to_tsvector('chinese', original_text));

-- 启用 RLS (行级安全)
ALTER TABLE cleaned_data ENABLE ROW LEVEL SECURITY;

-- 创建策略（根据需要调整）
CREATE POLICY "允许所有操作" ON cleaned_data FOR ALL USING (true);
```

### 5. 部署到 Cloudflare

```bash
# 开发环境测试
wrangler dev

# 部署到生产环境
wrangler deploy
```

### 6. 前端静态文件部署

有两种方式部署前端文件：

#### 方式 1：Cloudflare Pages（推荐）

```bash
# 将 public/ 目录部署到 CF Pages
wrangler pages deploy public --project-name cf-data-cleaner-frontend
```

#### 方式 2：修改 HTML 中的 API 地址

编辑 `public/data_cleaner.html` 和 `public/data_viewer.html`：

```javascript
// 修改 API_BASE_URL 为你的 Worker 域名
const API_BASE_URL = 'https://your-worker.your-subdomain.workers.dev';
```

## 🔧 配置说明

### wrangler.toml 配置

```toml
name = "cf-data-cleaner"
main = "src/index.js"
compatibility_date = "2023-12-18"

[vars]
ENVIRONMENT = "production"
```

### 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `AI_API_KEY` | AI 服务 API 密钥 | `sk-xxx` |
| `SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_KEY` | Supabase 服务密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## 📖 使用说明

### 数据清洗

1. 访问 `https://your-pages-url/data_cleaner.html`
2. 输入或粘贴要清洗的文本内容
3. 可选：修改 System Prompt 调整清洗策略
4. 点击"数据清洗"按钮进行 AI 处理
5. 查看清洗结果并可编辑段落内容
6. 点击"保存到数据库"存储结果

### 数据管理

1. 访问 `https://your-pages-url/data_viewer.html`
2. 查看所有清洗记录的列表和统计信息
3. 可以查看、编辑、删除单条记录
4. 支持分页浏览和搜索功能

## 🎯 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/data_cleaner/get_default_prompt` | GET | 获取默认 System Prompt |
| `/data_cleaner/clean_data` | POST | 执行数据清洗 |
| `/data_cleaner/save_data` | POST | 保存清洗结果 |
| `/data_cleaner/data_list` | GET | 获取数据列表 |
| `/data_cleaner/data/:id` | GET | 获取单条记录 |
| `/data_cleaner/data/:id` | PUT | 更新记录 |
| `/data_cleaner/data/:id` | DELETE | 删除记录 |
| `/health` | GET | 健康检查 |

## 💡 技术特点

- **无服务器架构**：基于 CF Workers，自动扩缩容
- **零冷启动**：CF Workers 毫秒级响应
- **全球 CDN**：就近访问，低延迟
- **成本极低**：CF Workers 免费额度足够大部分使用
- **高可用**：CF 全球网络保障

## 🔄 从原项目迁移

如果你有原来的 Python Flask 版本，数据迁移步骤：

1. 导出 PKL 文件数据
2. 转换为 JSON 格式
3. 通过 API 批量导入到 Supabase

## 🐛 故障排除

### 常见问题

1. **API 调用失败**
   - 检查环境变量是否正确设置
   - 验证 AI API 密钥是否有效

2. **数据库连接失败**
   - 确认 Supabase 配置正确
   - 检查数据库表是否已创建

3. **CORS 错误**
   - 确认 Worker 已启用 CORS
   - 检查域名配置

### 调试命令

```bash
# 查看 Worker 日志
wrangler tail

# 本地开发调试
wrangler dev --local
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！