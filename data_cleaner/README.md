# AI数据清洗模块使用说明

## 功能概述

AI数据清洗模块是专门用于通过人工智能进行数据清洗和结构化处理的工具，能够将原始文本转换为高质量的RAG知识库格式。

## 功能特性

- ✨ **智能文本清洗** - 使用AI进行语义段落切分和内容清洗
- 📝 **可定制提示词** - 支持自定义System Prompt调整清洗策略
- 🖼️ **图片OCR支持** - 支持上传图片进行文字识别后清洗
- 💾 **数据持久化** - 清洗结果自动保存到PostgreSQL数据库
- ✏️ **结果编辑** - 支持对清洗结果进行手动编辑和调整
- 📊 **结构化输出** - 生成包含摘要、关键词、分类等结构化数据

## 使用步骤

### 1. 配置准备

在根目录的 `key.txt` 文件中配置：
```
your_api_key_here
postgresql://postgres:password@localhost:5432/postgres
```

第一行：AI API密钥（根据config.py中的配置使用对应服务的密钥）
第二行：PostgreSQL数据库连接字符串

### 2. 访问页面

启动应用后，访问：`http://localhost:5000/data_cleaner/`

### 3. 上传文件

- 支持的文件类型：`.txt` 文本文件、`.jpg/.png` 图片文件
- 可以点击上传区域选择文件，或直接拖拽文件到上传区域

### 4. 数据清洗

- 上传文件后，原文将显示在左侧区域
- 可在底部的System Prompt区域调整清洗策略
- 点击"数据清洗"按钮开始AI处理
- 清洗结果将显示在右侧区域，包含：
  - 段落摘要
  - 关键词标签
  - 内容分类
  - 搜索向量文本

### 5. 编辑和保存

- 可点击每个段落的"编辑"按钮修改内容
- 点击"数据入库"按钮将结果保存到数据库

## 数据库结构

```sql
CREATE TABLE cleaned_data (
    id SERIAL PRIMARY KEY,
    original_text TEXT NOT NULL,           -- 原始文本
    cleaned_data JSONB NOT NULL,          -- 清洗后的JSON数据
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
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
  "cleaned_data": {...}
}
```

### 获取数据列表
```
GET /data_cleaner/data_list?limit=50&offset=0
```

### 获取数据详情
```
GET /data_cleaner/data/{data_id}
```

### 更新数据
```
PUT /data_cleaner/data/{data_id}
Content-Type: application/json

{
  "cleaned_data": {...}
}
```

### 删除数据
```
DELETE /data_cleaner/data/{data_id}
```

### 服务状态
```
GET /data_cleaner/status
```

## 注意事项

1. **数据库连接** - 确保PostgreSQL数据库正常运行且连接信息正确
2. **API密钥** - 根据config.py中的AI服务配置，使用对应的API密钥
3. **文件大小** - 建议单个文件不超过10MB
4. **AI响应时间** - 根据文本长度，AI处理时间可能需要10-60秒

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查PostgreSQL服务是否启动
   - 验证连接字符串格式和凭据

2. **AI调用失败**
   - 检查API密钥是否正确
   - 确认网络连接正常
   - 查看config.py中的AI服务配置

3. **文件上传失败**
   - 检查文件格式是否支持
   - 确认文件大小合理

4. **清洗结果格式错误**
   - 检查System Prompt是否正确
   - 尝试使用默认提示词

## 文件结构

```
data_cleaner/
├── __init__.py                # 模块初始化
├── prompt_config.py           # 提示词配置
├── database.py                # 数据库操作
├── cleaner_service.py         # 主要业务逻辑
├── routes.py                  # Flask路由
└── README.md                  # 本说明文档

templates/
└── data_cleaner.html          # 前端页面

key.txt                        # 配置文件（位于项目根目录）
```