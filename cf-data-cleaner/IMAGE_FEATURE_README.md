# 图片识别功能说明

## 🚀 新功能概述

现在数据清洗工具支持两种模式：
- **文本处理模式**：传统的文本清洗功能
- **图片识别模式**：使用 DeepSeek-VL2 模型识别图片内容并进行结构化处理

## 📋 部署前准备

### 1. 数据库更新

在使用新功能前，请先在 Supabase 数据库中执行以下 SQL 语句：

```sql
-- 增加内容类型字段
ALTER TABLE cleaned_data
ADD COLUMN content_type VARCHAR(20) DEFAULT 'text' NOT NULL;

-- 增加注释说明
COMMENT ON COLUMN cleaned_data.content_type IS '内容类型: text(文本) 或 image(图片)';

-- 为现有记录设置默认值
UPDATE cleaned_data SET content_type = 'text' WHERE content_type IS NULL;

-- 创建索引提高查询性能
CREATE INDEX idx_cleaned_data_content_type ON cleaned_data(content_type);
```

或直接执行项目根目录下的 `database_update.sql` 文件。

## 🎯 功能特性

### 文本处理模式
- 支持直接输入文本
- 支持拖拽上传 .txt 文件
- 使用 DeepSeek-V3 模型进行智能清洗

### 图片识别模式
- 支持拖拽上传图片文件（jpg, png, gif 等）
- 图片大小限制：10MB
- 使用 DeepSeek-VL2 多模态模型进行内容识别
- 实时图片预览功能

## 💡 使用方法

### 切换模式
1. 在数据清洗页面顶部选择处理类型
2. 点击 "文本处理" 或 "图片识别" 按钮切换模式

### 图片识别流程
1. 切换到 "图片识别" 模式
2. 拖拽图片文件到上传区域或点击选择文件
3. 系统会显示图片预览
4. 配置 System Prompt（可使用默认提示词）
5. 点击 "数据清洗" 开始识别
6. 查看识别结果，可编辑所有字段
7. 保存到数据库

## 🔧 技术实现

### 前端改进
- 模式切换界面
- 图片上传和预览
- 双模式的事件处理
- 统一的编辑体验

### 后端API
- `POST /data_cleaner/clean_image` - 图片识别接口
- `POST /data_cleaner/clean_data` - 文本清洗接口（已存在）
- `POST /data_cleaner/save_data` - 统一保存接口（支持content_type）

### AI模型
- **文本处理**：`deepseek-ai/deepseek-v3`
- **图片识别**：`deepseek-ai/deepseek-vl2`

## 📊 数据库结构

### 新增字段
- `content_type`: 'text' | 'image' - 标识内容类型
- 默认值为 'text'，确保向后兼容

### 数据存储
- 文本模式：存储原始文本内容
- 图片模式：存储 "[图片内容]" 标识，主要保存识别结果

## 🌟 系统特点

- **简化设计**：减少耦合，功能模块化
- **统一体验**：相同的编辑和保存流程
- **向后兼容**：不影响现有数据和功能
- **共用配置**：System Prompt 两种模式通用

## 🔗 部署地址

访问: https://cf-data-cleaner.coder-zlen.workers.dev/data_cleaner/

开始体验图片识别功能！