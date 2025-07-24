# 🌍 多语言支持功能说明

## 📋 功能概述

系统现已支持中英文双语，用户可以在不同场景下选择合适的语言进行操作。多语言支持主要体现在System Prompt和界面提示信息的自动切换。

## 🚀 支持的功能模块

### 1. 📝 数据清洗页面
- **语言选择器**：位于System Prompt配置区域的右上角
- **自动提示词**：根据选择的语言自动加载对应的默认提示词
- **界面文本**：按钮和提示信息会根据语言设置显示

**功能特点**：
- 🇺🇸 **英文模式**（默认）：使用英文的数据清洗提示词，适合处理英文内容
- 🇨🇳 **中文模式**：使用中文的数据清洗提示词，适合处理中文内容
- 🔄 **实时切换**：选择语言后立即更新提示词和界面

### 2. 🤖 RAG对话页面
- **自动检测**：系统可以自动检测用户问题的语言
- **手动选择**：用户可以在设置面板中手动选择语言
- **智能响应**：AI会根据检测到的语言使用相应的提示词回答

**语言检测逻辑**：
- 中文字符比例 > 30% → 识别为中文
- 中文字符比例 ≤ 30% → 识别为英文
- 用户可手动覆盖自动检测结果

## 🛠️ 技术实现

### 1. System Prompt 模板

#### 数据清洗 - 中文版本
```text
你是一个专业的数据清洗和结构化专家，专门负责将原始文本数据清洗并转换为结构化的RAG知识库格式。

## 任务目标
将输入的原始文本按语义段落进行智能切分和清洗，生成高质量的结构化数据用于RAG检索系统。

## 处理要求
1. **语义切分**：根据内容逻辑和语义完整性，将文本切分成独立的段落块
2. **内容清洗**：去除无意义字符、修正格式问题、统一标点符号
3. **信息提取**：为每个段落生成摘要、关键词、分类和搜索向量文本

## 输出格式
必须严格按照以下JSON格式返回，不要包含任何其他文字说明：
{
  "chunks": [
    {
      "summary": "该段落的核心内容摘要，15-30字",
      "keywords": ["关键词1", "关键词2", "关键词3"],
      "category": "内容分类（如：技术概念、操作步骤、理论知识等）",
      "search_vector": "优化后的搜索文本，包含原文关键信息和同义词"
    }
  ]
}
```

#### 数据清洗 - 英文版本
```text
You are a professional data cleaning and structuring expert, specialized in cleaning and converting raw text data into structured RAG knowledge base format.

## Task Objective
Intelligently segment and clean input raw text by semantic paragraphs, generating high-quality structured data for RAG retrieval systems.

## Processing Requirements
1. **Semantic Segmentation**: Segment text into independent paragraph blocks based on content logic and semantic completeness
2. **Content Cleaning**: Remove meaningless characters, fix formatting issues, standardize punctuation
3. **Information Extraction**: Generate summary, keywords, categories, and search vector text for each paragraph

## Output Format
Must strictly return in the following JSON format without any other text explanations:
{
  "chunks": [
    {
      "summary": "Core content summary of this paragraph, 10-50 words",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "category": "Content category (e.g., Technical Concept, Operational Steps, Theoretical Knowledge, etc.)",
      "search_vector": "Optimized search text containing key information and synonyms from original text"
    }
  ]
}
```

#### RAG对话 - 中文版本
```text
你是一个专业的知识助手，专门基于提供的知识库内容回答用户问题。

回答要求：
1. 主要基于提供的知识库内容进行回答
2. 如果知识库中没有相关信息，请明确说明并提供一般性建议
3. 回答要准确、详细且有条理
4. 可以适当引用知识库中的具体内容
5. 保持友好和专业的语调

知识库内容：
{KNOWLEDGE_CONTEXT}

用户问题：{USER_QUESTION}
```

#### RAG对话 - 英文版本
```text
You are a professional knowledge assistant specialized in answering user questions based on the provided knowledge base content.

Response Requirements:
1. Answer primarily based on the provided knowledge base content
2. If no relevant information is found in the knowledge base, clearly state this and provide general suggestions
3. Answers should be accurate, detailed, and well-organized
4. Appropriately quote specific content from the knowledge base
5. Maintain a friendly and professional tone

Knowledge Base Content:
{KNOWLEDGE_CONTEXT}

User Question: {USER_QUESTION}
```

### 2. 分词算法优化

#### 中文分词
- 移除中文标点符号：，。！？；：""''（）【】《》
- 提取2-4字的中文词组
- 过滤条件：包含中文字符、字母或数字

#### 英文分词
- 转换为小写并移除标点符号
- 过滤英文停用词：the, a, an, and, or, but, in, on, at, to, for, of, with, by, is, are, was, were, be, been, being, have, has, had, do, does, did, will, would, could, should, may, might, can, must, shall, i, you, he, she, it, we, they, me, him, her, us, them, this, that, these, those, here, there, where, when, how, why, what
- 生成2-3词的短语组合

#### 语言自动检测
```javascript
// 检测逻辑
const chineseRatio = (text.match(/[\u4e00-\u9fa5]/g) || []).length / text.length;
const language = chineseRatio > 0.3 ? 'zh' : 'en';
```

### 3. API 更新

#### 获取默认提示词 API
```
GET /data_cleaner/get_default_prompt?language=zh|en

Response:
{
  "success": true,
  "prompt": "提示词内容",
  "language": "zh"
}
```

#### RAG对话 API
```
POST /chat/ask

Request:
{
  "question": "用户问题",
  "system_prompt": "可选的系统提示词",
  "language": "zh|en|auto"
}

Response:
{
  "success": true,
  "answer": "AI回答",
  "sources": [...],
  "stats": {...}
}
```

## 🎯 使用指南

### 1. 数据清洗页面使用

1. **选择语言**：
   - 在System Prompt配置区域找到语言选择器
   - 选择 🇨🇳 中文 或 🇺🇸 English

2. **自动加载**：
   - 选择语言后，系统会自动加载对应的默认提示词
   - 界面按钮和提示文本也会切换到对应语言

3. **手动重置**：
   - 点击"重置默认"/"Reset Default"按钮重新加载当前语言的默认提示词

### 2. RAG对话页面使用

1. **自动模式**（推荐）：
   - 选择"🌐 自动检测"
   - 系统根据问题内容自动选择合适的语言和提示词

2. **手动模式**：
   - 在设置面板中选择具体语言：🇨🇳 中文 或 🇺🇸 English
   - 系统将强制使用选定语言的提示词

3. **提示词自定义**：
   - 点击"加载默认"按钮重新加载当前语言的默认RAG提示词
   - 可以基于默认提示词进行个性化修改

## 🔧 配置选项

### 环境变量
无需额外配置，多语言功能使用现有的API密钥和数据库配置。

### 自定义参数
```javascript
// 语言检测阈值（可在代码中调整）
const CHINESE_DETECTION_THRESHOLD = 0.3;  // 中文字符比例阈值

// 支持的语言列表
const SUPPORTED_LANGUAGES = ['zh', 'en'];

// 默认语言
const DEFAULT_LANGUAGE = 'en';
```

## 📈 功能优势

### 1. 提升准确性
- **语言匹配**：使用相应语言的提示词可以提高AI理解和回答的准确性
- **文化适配**：不同语言的表达习惯和文化背景得到更好的适配

### 2. 改善用户体验
- **无缝切换**：一键切换语言，无需重新配置
- **智能检测**：自动识别用户意图，减少手动选择的负担
- **一致性**：界面语言和AI回答语言保持一致

### 3. 扩展性
- **易于扩展**：架构设计支持未来添加更多语言
- **模块化**：各语言的提示词独立管理，便于维护和优化

## 🐛 常见问题

### Q1: 自动语言检测不准确怎么办？
**A**: 可以手动选择语言覆盖自动检测结果。对于混合语言内容，建议选择主要语言。

### Q2: 切换语言后，之前的对话记录会改变吗？
**A**: 不会。语言设置只影响新的对话，历史记录保持不变。

### Q3: 英文分词效果不好怎么办？
**A**: 当前使用的是简单的停用词过滤，对于专业术语可能需要在System Prompt中特别说明。

### Q4: 可以添加其他语言吗？
**A**: 当前版本支持中英文，未来可以根据需求添加其他语言支持。

## 🚀 后续开发计划

### 短期计划
- [ ] 优化语言检测算法的准确性
- [ ] 增加更多界面元素的多语言支持
- [ ] 添加语言选择的记忆功能（localStorage）

### 长期计划
- [ ] 支持更多语言（日文、韩文、法文等）
- [ ] 实现更智能的混合语言处理
- [ ] 添加语言偏好的用户配置

---

🎉 **现在就开始体验多语言功能吧！**

选择您偏好的语言，享受更准确、更贴近的AI服务体验。