# Data Cleaner 模块 CF Workers 迁移指南

## 📋 迁移清单

### 🗑️ 需要删除的原项目文件

#### Python 后端文件
```
删除目录：data_cleaner/
├── __init__.py
├── cleaner_service.py    # 490行 - 核心业务逻辑
├── database.py          # 307行 - PostgreSQL数据库操作
├── pkl_storage.py       # 251行 - PKL文件存储
├── prompt_config.py     # 47行 - 提示词配置
└── routes.py           # 292行 - Flask路由
```

#### 其他不需要的文件
```
删除文件：
├── image_processor.py   # 图片OCR功能
├── web_app.py          # 主Flask应用（保留其他部分，只删除data_cleaner相关路由）
├── requirements.txt    # Python依赖（如果完全迁移）
└── templates/
    ├── index.html      # 主页（如果只保留data_cleaner）
    └── knowledge_base.html  # 知识库页面
```

#### 不需要的功能模块
- 图片上传和OCR识别
- PKL文件存储
- Flask蓝图注册
- Python ML模型依赖

### ✨ 新创建的CF Workers文件

#### 项目结构
```
cf-data-cleaner/          # 新项目目录
├── src/
│   └── index.js         # 410行 - CF Workers主入口
├── public/
│   ├── data_cleaner.html    # 简化版数据清洗页面
│   └── data_viewer.html     # 简化版数据查看页面
├── package.json         # 16行 - Node.js依赖配置
├── wrangler.toml        # 25行 - CF Workers配置
├── README.md           # 详细部署指南
└── MIGRATION.md        # 本迁移文档
```

## 🔄 功能对比

### 保留的核心功能
| 功能 | 原实现 | 新实现 |
|------|--------|--------|
| 获取默认提示词 | `cleaner_service.py` | `index.js` DataCleanerService类 |
| AI数据清洗 | `llm_client.py` + `cleaner_service.py` | `index.js` cleanData方法 |
| 数据库保存 | `database.py` | `index.js` saveData方法 |
| 数据列表查询 | `database.py` | `index.js` getDataList方法 |
| 单条记录CRUD | `database.py` | `index.js` 对应方法 |
| 前端界面 | Flask模板 | 静态HTML页面 |

### 简化/删除的功能
- ❌ **图片OCR识别**：移除 `image_processor.py` 相关功能
- ❌ **PKL文件存储**：只保留Supabase数据库存储
- ❌ **复杂文件上传**：简化为纯文本输入和.txt文件拖拽
- ❌ **存储方式切换**：移除PKL/数据库选择功能
- ❌ **复杂的模态编辑**：简化为基础的prompt编辑

### 增强的功能
- ✅ **无服务器架构**：零运维，自动扩缩容
- ✅ **全球CDN部署**：更快的访问速度
- ✅ **环境变量管理**：更安全的密钥管理
- ✅ **健康检查接口**：便于监控和调试

## 🛠️ 具体迁移步骤

### 第一步：环境准备
1. 安装 Cloudflare CLI
2. 创建 Supabase 项目
3. 配置必要的 API 密钥

### 第二步：数据库迁移
```sql
-- 从原项目的PostgreSQL表结构迁移到Supabase
-- 原表：cleaned_data
-- 目标：保持相同的表结构，添加必要索引
```

### 第三步：代码迁移对照

#### 原 `cleaner_service.py` → 新 `index.js`
```python
# 原代码示例
class DataCleanerService:
    def clean_data(self, text, system_prompt):
        # Python实现
        pass
```

```javascript
// 新代码实现
class DataCleanerService {
  async cleanData(text, systemPrompt) {
    // JavaScript实现
  }
}
```

#### 原 `database.py` → 新 Supabase API调用
```python
# 原代码
def save_cleaned_data(self, original_text, cleaned_data):
    cursor.execute("INSERT INTO...")
```

```javascript
// 新代码
async saveData(originalText, cleanedData) {
  const response = await fetch(`${this.env.SUPABASE_URL}/rest/v1/cleaned_data`, {
    method: 'POST',
    headers: { /* Supabase headers */ },
    body: JSON.stringify({ /* data */ })
  })
}
```

### 第四步：前端页面适配
1. 移除图片上传相关代码
2. 简化存储方式选择
3. 修改API调用地址
4. 优化移动端适配

### 第五步：部署验证
1. 本地开发测试
2. 部署到CF Workers
3. 验证所有API功能
4. 测试前端页面交互

## 📊 技术栈变化

| 组件 | 原技术栈 | 新技术栈 |
|------|----------|----------|
| **后端框架** | Python Flask | Cloudflare Workers + Hono |
| **数据库** | PostgreSQL | Supabase PostgreSQL |
| **AI调用** | 自建LLMClient | 直接fetch API |
| **部署** | VPS/云服务器 | Cloudflare Workers |
| **前端托管** | Flask模板 | Cloudflare Pages |
| **依赖管理** | pip + requirements.txt | npm + package.json |

## 🎯 性能和成本优势

### 性能提升
- **冷启动时间**：Python Flask ~2-5秒 → CF Workers ~1-5毫秒
- **内存使用**：Python ~50-100MB → CF Workers ~5-10MB
- **并发能力**：受服务器限制 → 自动无限扩容
- **全球延迟**：单一服务器 → 全球CDN边缘计算

### 成本优化
- **服务器费用**：月租费用 → 按使用付费（免费额度大）
- **运维成本**：需要维护 → 零运维
- **监控告警**：自建 → Cloudflare内置

## ⚠️ 注意事项

### 限制和约束
1. **执行时间**：CF Workers最大执行时间30秒
2. **内存限制**：128MB内存限制
3. **包大小**：代码包不能超过1MB（压缩后）
4. **并发连接**：数据库连接需要合理管理

### 兼容性考虑
1. **数据格式**：确保清洗结果JSON格式兼容
2. **API接口**：保持相同的请求/响应格式
3. **数据库表**：表结构保持一致

## 🔄 回滚方案

如果迁移过程中遇到问题，可以：

1. **保留原项目**：在迁移完成前不删除原代码
2. **数据备份**：迁移前完整备份数据库
3. **分步验证**：逐个功能验证后再切换
4. **灰度发布**：部分用户先使用新版本

## 📞 技术支持

迁移过程中如遇到问题，可以：
- 查看CF Workers文档
- 参考Supabase API文档
- 检查本项目的README.md
- 查看示例代码和注释