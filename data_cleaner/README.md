# AI数据清洗模块使用说明

## 功能概述

AI数据清洗模块是专门用于通过人工智能进行数据清洗和结构化处理的工具，能够将原始文本转换为高质量的RAG知识库格式。支持将清洗后的数据保存到PostgreSQL数据库或PKL文件中。

## 功能特性

- ✨ **智能文本清洗** - 使用AI进行语义段落切分和内容清洗
- 📝 **可定制提示词** - 支持自定义System Prompt调整清洗策略
- 🖼️ **图片OCR支持** - 支持上传图片进行文字识别后清洗
- 💾 **双存储方式** - 支持保存到PostgreSQL数据库或PKL文件
- ✏️ **结果编辑** - 支持对清洗结果进行手动编辑和调整
- 📊 **结构化输出** - 生成包含摘要、关键词、分类等结构化数据
- 🔄 **数据导入导出** - PKL数据支持导出为JSON格式
- 👁️ **数据查看器** - 专门的页面查看、编辑和管理清洗后的数据

## 存储方式对比

| 特性 | PostgreSQL数据库 | PKL文件 |
|------|------------------|---------|
| **适用场景** | 生产环境、多用户访问 | 开发测试、单用户使用 |
| **性能** | 高并发、事务支持 | 快速读写、内存友好 |
| **数据持久性** | 高可靠性、备份恢复 | 文件级备份 |
| **查询能力** | SQL查询、索引优化 | Python对象操作 |
| **部署要求** | 需要数据库服务 | 无额外依赖 |
| **数据迁移** | 标准SQL导入导出 | JSON格式导入导出 |

## 使用步骤

### 1. 配置准备

在根目录的 `key.txt` 文件中配置：
```
your_api_key_here
postgresql://postgres:mzl04592@localhost:5432/postgres
```

第一行：AI API密钥（根据config.py中的配置使用对应服务的密钥）
第二行：PostgreSQL数据库连接字符串（使用数据库存储时需要）

### 2. 访问页面

启动应用后，可以访问以下页面：
- 数据清洗页面：`http://localhost:5000/data_cleaner/`
- 数据查看器：`http://localhost:5000/data_cleaner/viewer`

### 3. 选择存储方式

在页面右上角的"存储方式"下拉框中选择：
- **数据库** - 保存到PostgreSQL数据库（需要数据库配置）
- **PKL文件** - 保存到本地PKL文件（cleaned_data.pkl）

### 4. 上传文件

- 支持的文件类型：`.txt` 文本文件、`.jpg/.png` 图片文件
- 可以点击上传区域选择文件，或直接拖拽文件到上传区域

### 5. 数据清洗

- 上传文件后，原文将显示在左侧区域
- 可在底部的System Prompt区域调整清洗策略
- 点击"数据清洗"按钮开始AI处理
- 清洗结果将显示在右侧区域，包含：
  - 段落摘要
  - 关键词标签
  - 内容分类
  - 搜索向量文本

### 6. 编辑和保存

- 可点击每个段落的"编辑"按钮修改内容
- 选择存储方式后，点击对应的保存按钮：
  - "数据入库" - 保存到数据库
  - "保存到PKL" - 保存到PKL文件

## 数据查看器功能

### 访问数据查看器
访问 `http://localhost:5000/data_cleaner/viewer` 或在主页点击"👁️ 数据查看器"链接。

### 主要功能

**1. 存储方式切换**
- 页面顶部可以切换查看数据库或PKL文件中的数据
- 实时显示当前存储的统计信息

**2. 统计信息展示**
- 总记录数
- 最近7天新增记录数
- 平均文本长度
- 存储大小（数据库大小或PKL文件大小）

**3. 数据列表管理**
- 分页显示所有清洗后的数据
- 实时搜索原文内容
- 支持查看、编辑、删除操作

**4. 详细信息查看**
- 点击"👁️"查看完整的原文和清洗结果
- 显示所有chunks的详细信息
- 显示创建和更新时间

**5. 在线编辑功能**
- 点击"✏️"进入编辑模式
- 可修改摘要、关键词、分类、搜索向量
- 关键词支持逗号分隔输入
- 保存后立即生效

**6. 数据导出**
- PKL数据支持导出为JSON格式
- 便于数据备份和跨环境迁移

### 界面特色
- 响应式设计，适配各种屏幕尺寸
- 直观的统计卡片展示
- 表格式数据展示，信息清晰
- 模态框编辑，不离开主页面
- 智能分页，提升大数据集浏览体验

## 数据库结构

### PostgreSQL数据库表
```sql
CREATE TABLE cleaned_data (
    id SERIAL PRIMARY KEY,
    original_text TEXT NOT NULL,           -- 原始文本
    cleaned_data JSONB NOT NULL,          -- 清洗后的JSON数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### PKL文件结构
```python
[
    {
        'id': 1,
        'original_text': '原始文本',
        'cleaned_data': {...},  # JSON格式的清洗数据
        'created_at': '2024-01-01T12:00:00',
        'updated_at': '2024-01-01T12:00:00'
    }
]
```

清洗后的JSON格式：
```json
{
  "chunks": [
    {
      "summary": "段落摘要",
      "keywords": ["关键词1", "关键词2"],
      "category": "内容分类",
      "search_vector": "优化后的搜索文本"
    }
  ]
}
```

## API接口

### 获取默认提示词
```
GET /data_cleaner/get_default_prompt
```

### 数据清洗
```
POST /data_cleaner/clean_data
Content-Type: application/json

{
  "text": "要清洗的文本",
  "system_prompt": "可选的自定义提示词"
}
```

### 保存数据
```
POST /data_cleaner/save_data
Content-Type: application/json

{
  "original_text": "原始文本",
  "cleaned_data": {...},
  "storage_type": "database" | "pkl"  // 存储方式
}
```

### 获取数据列表
```
GET /data_cleaner/data_list?limit=50&offset=0&storage_type=database
```

### 获取数据详情
```
GET /data_cleaner/data/{data_id}?storage_type=database
```

### 更新数据
```
PUT /data_cleaner/data/{data_id}
Content-Type: application/json

{
  "cleaned_data": {...},
  "storage_type": "database" | "pkl"
}
```

### 删除数据
```
DELETE /data_cleaner/data/{data_id}?storage_type=database
```

### 服务状态
```
GET /data_cleaner/status
```

### PKL数据导出到JSON
```
POST /data_cleaner/export_pkl_to_json
```

### JSON数据导入到PKL
```
POST /data_cleaner/import_json_to_pkl
Content-Type: application/json

{
  "json_file": "path/to/export.json"
}
```

## 数据管理建议

### 开发阶段
- 使用PKL文件存储，便于快速测试和迭代
- 利用JSON导出功能备份重要数据
- 定期清理测试数据，保持PKL文件大小合理

### 生产环境
- 使用PostgreSQL数据库存储，确保数据安全和一致性
- 配置数据库备份策略
- 监控数据库性能和存储空间

### 数据迁移
1. **PKL → 数据库**：使用JSON导出功能，然后批量导入数据库
2. **数据库 → PKL**：通过API获取数据，批量保存到PKL文件
3. **跨环境迁移**：使用JSON格式作为中间格式

## 注意事项

1. **存储选择** - 根据使用场景选择合适的存储方式
2. **数据备份** - PKL文件建议定期备份，数据库配置自动备份
3. **文件大小** - PKL文件过大时会影响加载速度，建议分批管理
4. **并发访问** - PKL文件不支持并发写入，多用户环境请使用数据库
5. **API密钥** - 根据config.py中的AI服务配置，使用对应的API密钥

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查PostgreSQL服务是否启动
   - 验证连接字符串格式和凭据
   - 切换到PKL存储作为备选方案

2. **PKL文件损坏**
   - 查看是否存在.backup备份文件
   - 尝试从JSON导出文件恢复
   - 重新初始化PKL存储

3. **存储方式切换**
   - 两种存储方式数据独立管理
   - 需要手动迁移已有数据
   - 使用导入导出功能进行数据转移

4. **性能问题**
   - PKL文件过大：定期清理或分割数据
   - 数据库慢查询：添加索引或优化查询
   - 同时使用两种存储：注意数据一致性

## 文件结构

```
data_cleaner/
├── __init__.py                # 模块初始化
├── prompt_config.py           # 提示词配置
├── database.py                # PostgreSQL数据库操作
├── pkl_storage.py             # PKL文件存储操作
├── cleaner_service.py         # 主要业务逻辑
├── routes.py                  # Flask路由
└── README.md                  # 本说明文档

templates/
├── data_cleaner.html          # 数据清洗页面
└── data_viewer.html           # 数据查看器页面

key.txt                        # 配置文件（位于项目根目录）
cleaned_data.pkl               # PKL存储文件（自动生成）
```