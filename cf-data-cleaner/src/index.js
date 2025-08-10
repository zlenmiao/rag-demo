import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { dataCleanerHTML } from './templates/data_cleaner.js'
import { dataViewerHTML } from './templates/data_viewer.js'
import { chatHTML } from './templates/chat.js'

const app = new Hono()

// 中间件
app.use('/*', cors())
app.use('/*', logger())

// 数据清洗服务类
class DataCleanerService {
  constructor(env) {
    this.env = env
  }

  getDefaultPrompt(language = 'zh') {
    if (language === 'en') {
      return `You are a professional data cleaning and structuring expert for RAG knowledge bases. The input may be raw text, JSON-like text, or an image (with embedded text).

Task
Segment and clean the input into semantically complete paragraphs and produce high-quality, retrieval-ready data.

Strict Content Rules
1) General cleaning
   - Remove meaningless characters, excessive whitespace, and normalize punctuation
   - Deduplicate repeated content; keep the most informative version only
2) If input is JSON/code-like (including screenshots of JSON/UI)
   - Use only VALUE content; ignore all KEY/FIELD names and structural symbols such as { } [ ] : , "
   - Do NOT copy keys like title, name, id, value, key, field, label, type, created_at, etc.
   - Flatten list/object values into fluent natural language; remove boilerplate and technical scaffolding
   - Keep human-readable content only; drop pure IDs, hashes, boilerplate labels, or braces/quotes
3) If input is an image
   - Read visible text and meaningful content only; ignore UI chrome, labels, keys, and decorative symbols
   - Apply the same “values-only, no JSON/keys” rule as above

Information Extraction (per paragraph)
- summary: 10–40 words; values-only (no JSON symbols or keys)
- keywords: 3–8 concise terms; values-only; lower noise; no JSON residue
- category: concise content category (e.g., Technical Concept, Procedure, Definition, Best Practice, Limitation)
- search_vector: plain text optimized for search; values-only; no braces/quotes/keys; prefer nouns and key phrases

Output Format
Return ONLY valid JSON (no extra text, no code fences):
{
  "chunks": [
    {
      "summary": "...values-only summary...",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "category": "...",
      "search_vector": "...values-only searchable text..."
    }
  ]
}

Validation Before Responding
- Ensure none of the fields include JSON structural characters (outside of required JSON encoding) or key names from the input
- Ensure output language follows the selected language (English here)`;
    }

    return `你是一个为 RAG 知识库服务的专业“数据清洗与结构化”专家。输入可能是原始文本、JSON 类文本，或包含文字的图片。

任务
按语义将输入切分为完整段落并清洗，产出高质量、可检索的数据。

严格内容规则
1）通用清洗
   - 去除无意义字符、冗余空白，统一标点；消除重复，仅保留信息量最高的版本
2）当输入为 JSON/类代码（含 JSON/UI 截图）
   - 只保留“值”内容（VALUE）；忽略所有“键/字段名”（KEY/FIELD）及结构符号 { } [ ] : , "
   - 禁止拷贝如 title、name、id、value、key、field、label、type、created_at 等键名
   - 将列表/对象的值压平为自然语言；去除样板与技术性支架信息
   - 仅保留可读内容；丢弃纯 ID、哈希、样板标签以及大括号/引号等符号
3）当输入为图片
   - 仅提取可见且有意义的文字；忽略 UI 装饰、标签、键名与符号
   - 同样遵循“仅值、不含键/符号”的规则

信息提取（每段）
- summary：15–30 字；仅值文本（不得含 JSON 符号或键名）
- keywords：3–8 个精炼词；仅值文本；降低噪音；不得残留 JSON 痕迹
- category：简洁的内容类别（如：技术概念、操作步骤、定义、最佳实践、限制）
- search_vector：用于检索的纯文本；仅值文本；不含大括号/引号/键名；偏好名词与关键短语

输出格式
仅返回合法 JSON（不要有额外文字或代码块围栏）：
{
  "chunks": [
    {
      "summary": "……仅值文本摘要……",
      "keywords": ["关键词1", "关键词2", "关键词3"],
      "category": "……",
      "search_vector": "……仅值的可检索文本……"
    }
  ]
}

响应前自检
- 确保各字段未包含输入中的 JSON 结构符号（除输出 JSON 必需的编码外）或键名
- 确保输出语言遵循所选语言（此处为中文）`;
  }

  getDefaultChatPrompt(language = 'en') {
    if (language === 'en') {
      return `You are a professional knowledge assistant specialized in answering user questions based on the provided knowledge base content.

Response Requirements:
1. Answer primarily based on the provided knowledge base content
2. If no relevant information is found in the knowledge base, clearly state this and provide general suggestions
3. Answers should be accurate, detailed, and well-organized
4. Appropriately quote specific content from the knowledge base
5. Maintain a friendly and professional tone

Knowledge Base Content:
{KNOWLEDGE_CONTEXT}

User Question: {USER_QUESTION}`;
    }

    return `你是一个专业的知识助手，专门基于提供的知识库内容回答用户问题。

回答要求：
1. 主要基于提供的知识库内容进行回答
2. 如果知识库中没有相关信息，请明确说明并提供一般性建议
3. 回答要准确、详细且有条理
4. 可以适当引用知识库中的具体内容
5. 保持友好和专业的语调

知识库内容：
{KNOWLEDGE_CONTEXT}

用户问题：{USER_QUESTION}`;
  }

  async cleanData(text, systemPrompt) {
    if (!this.env.AI_API_KEY) {
      return {
        success: false,
        error: "AI API密钥未配置"
      }
    }

    const prompt = systemPrompt || this.getDefaultPrompt()

    const messages = [
      {
        role: "system",
        content: prompt
      },
      {
        role: "user",
        content: `请对以下文本进行清洗和结构化处理：\n\n${text}`
      }
    ]

    try {
      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V3',
          messages: messages,
          max_tokens: 2000,
          temperature: 0.1
        })
      })

      if (!response.ok) {
        throw new Error(`AI API请求失败: ${response.status}`)
      }

      const result = await response.json()
      const content = result.choices[0].message.content

      // 清理JSON格式
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '')

      try {
        const cleanedData = JSON.parse(cleanContent)

        return {
          success: true,
          cleaned_data: cleanedData,
          usage: result.usage,
          model: result.model
        }
      } catch (parseError) {
        return {
          success: false,
          error: "AI返回的不是有效的JSON格式",
          raw_content: content
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `AI调用失败: ${error.message}`
      }
    }
  }

  async cleanImage(imageDataUrl, systemPrompt) {
    if (!this.env.AI_API_KEY) {
      return {
        success: false,
        error: "AI API密钥未配置"
      }
    }

    const prompt = systemPrompt || this.getDefaultPrompt()

    try {
      // 确保图片数据是正确的data URI格式
      let processedImageUrl = imageDataUrl;
      if (!imageDataUrl.startsWith('data:image/')) {
        // 如果不是完整的data URI，假设是base64并添加前缀
        processedImageUrl = `data:image/jpeg;base64,${imageDataUrl}`;
      }

      const requestBody = {
        model: 'deepseek-ai/deepseek-vl2', // 备选: 'Qwen/Qwen2-VL-72B-Instruct'
        messages: [
          {
            role: 'system',
            content: prompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: processedImageUrl
                }
              },
              {
                type: 'text',
                text: '请分析这张图片的内容，并按照system prompt的要求进行结构化处理。'
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1
      };

      console.log('VLM请求体:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error('VLM API错误响应:', errorText);
        throw new Error(`AI API请求失败: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('VLM API响应:', JSON.stringify(result, null, 2));

      const content = result.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('VLM API返回内容为空')
      }

      // 清理JSON格式
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '')

      try {
        const cleanedData = JSON.parse(cleanContent)

        return {
          success: true,
          cleaned_data: cleanedData,
          usage: result.usage,
          model: result.model
        }
      } catch (parseError) {
        // 如果不是有效JSON，返回简单格式
        return {
          success: true,
          cleaned_data: {
            chunks: [{
              summary: content.substring(0, 100) + '...',
              keywords: ['图片内容'],
              category: '图片识别',
              search_vector: content
            }]
          },
          raw_content: content
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `图片识别失败: ${error.message}`
      }
    }
  }

  async saveData(originalText, cleanedData, contentType = 'text', originalImage = null) {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_KEY) {
      return {
        success: false,
        error: "数据库配置未完成"
      }
    }

    try {
      const response = await fetch(`${this.env.SUPABASE_URL}/rest/v1/cleaned_data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': this.env.SUPABASE_ANON_KEY,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          original_text: originalText,
          cleaned_data: cleanedData,
          content_type: contentType,
          image_data: originalImage, // 存储Base64图片数据
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`数据库保存失败: ${response.status}`)
      }

      const result = await response.json()

      return {
        success: true,
        record_id: result[0]?.id,
        storage_type: 'database'
      }
    } catch (error) {
      return {
        success: false,
        error: `保存失败: ${error.message}`
      }
    }
  }

  async getDataList(limit = 10, offset = 0) {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_KEY) {
      return {
        success: false,
        error: "数据库配置未完成"
      }
    }

    try {
      // 获取数据列表
      const dataResponse = await fetch(
        `${this.env.SUPABASE_URL}/rest/v1/cleaned_data?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_KEY}`,
            'apikey': this.env.SUPABASE_ANON_KEY
          }
        }
      )

      // 获取总数
      const countResponse = await fetch(
        `${this.env.SUPABASE_URL}/rest/v1/cleaned_data?select=count&head=true`,
        {
          headers: {
            'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_KEY}`,
            'apikey': this.env.SUPABASE_ANON_KEY,
            'Prefer': 'count=exact'
          }
        }
      )

      if (!dataResponse.ok) {
        throw new Error(`获取数据失败: ${dataResponse.status}`)
      }

      const data = await dataResponse.json()
      const totalCount = parseInt(countResponse.headers.get('content-range')?.split('/')[1]) || 0

      // 计算统计信息
      const statistics = {
        total_records: totalCount,
        recent_records: data.filter(record => {
          const createdAt = new Date(record.created_at)
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          return createdAt > weekAgo
        }).length,
        avg_text_length: data.length > 0
          ? Math.round(data.reduce((sum, record) => sum + (record.original_text?.length || 0), 0) / data.length)
          : 0,
        file_size: Math.round(totalCount * 2 / 1024) // 估算大小 KB -> MB
      }

      return {
        success: true,
        data: data,
        statistics: statistics
      }
    } catch (error) {
      return {
        success: false,
        error: `获取数据失败: ${error.message}`
      }
    }
  }

  async getDataById(id) {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_KEY) {
      return {
        success: false,
        error: "数据库配置未完成"
      }
    }

    try {
      const response = await fetch(
        `${this.env.SUPABASE_URL}/rest/v1/cleaned_data?id=eq.${id}`,
        {
          headers: {
            'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_KEY}`,
            'apikey': this.env.SUPABASE_ANON_KEY
          }
        }
      )

      if (!response.ok) {
        throw new Error(`获取数据失败: ${response.status}`)
      }

      const data = await response.json()

      if (data.length === 0) {
        return {
          success: false,
          error: "记录不存在"
        }
      }

      return {
        success: true,
        data: data[0]
      }
    } catch (error) {
      return {
        success: false,
        error: `获取数据失败: ${error.message}`
      }
    }
  }

  async updateData(id, cleanedData) {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_KEY) {
      return {
        success: false,
        error: "数据库配置未完成"
      }
    }

    try {
      const response = await fetch(
        `${this.env.SUPABASE_URL}/rest/v1/cleaned_data?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': this.env.SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            cleaned_data: cleanedData,
            updated_at: new Date().toISOString()
          })
        }
      )

      if (!response.ok) {
        throw new Error(`更新失败: ${response.status}`)
      }

      return {
        success: true,
        message: "更新成功"
      }
    } catch (error) {
      return {
        success: false,
        error: `更新失败: ${error.message}`
      }
    }
  }

  async deleteData(id) {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_KEY) {
      return {
        success: false,
        error: "数据库配置未完成"
      }
    }

    try {
      const response = await fetch(
        `${this.env.SUPABASE_URL}/rest/v1/cleaned_data?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_KEY}`,
            'apikey': this.env.SUPABASE_ANON_KEY
          }
        }
      )

      if (!response.ok) {
        throw new Error(`删除失败: ${response.status}`)
      }

      return {
        success: true,
        message: "删除成功"
      }
    } catch (error) {
      return {
        success: false,
        error: `删除失败: ${error.message}`
      }
    }
  }

  // RAG对话相关方法

    // 多语言分词函数
  tokenizeText(text, language = 'auto') {
    // 自动检测语言（简单的启发式方法）
    if (language === 'auto') {
      const chineseRatio = (text.match(/[\u4e00-\u9fa5]/g) || []).length / text.length;
      language = chineseRatio > 0.3 ? 'zh' : 'en';
    }

    if (language === 'en') {
      return this.tokenizeEnglishText(text);
    } else {
      return this.tokenizeChineseText(text);
    }
  }

  // 中文分词函数
  tokenizeChineseText(text) {
    // 移除标点符号并分割
    const cleanText = text.replace(/[，。！？；：""''（）【】《》\s\n\r\t]/g, ' ');

    // 基于空格和常见分隔符分词
    let words = cleanText.split(/\s+/).filter(word => word.length > 0);

    // 提取2-4字的中文词组
    const phrases = [];
    for (let i = 0; i < words.length; i++) {
      for (let len = 2; len <= Math.min(4, words[i].length); len++) {
        if (i + len <= words.length) {
          const phrase = words.slice(i, i + len).join('');
          if (phrase.length >= 2 && /[\u4e00-\u9fa5]/.test(phrase)) {
            phrases.push(phrase);
          }
        }
      }
    }

    // 合并单字词和词组
    const allWords = [...words, ...phrases];

    // 去重并过滤过短的词
    return [...new Set(allWords)].filter(word =>
      word.length >= 1 && /[\u4e00-\u9fa5a-zA-Z0-9]/.test(word)
    );
  }

  // 英文分词函数
  tokenizeEnglishText(text) {
    // 移除标点符号并转为小写
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ');

    // 基于空格分词
    let words = cleanText.split(/\s+/).filter(word => word.length > 0);

    // 过滤停用词（简单版本）
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'how', 'why', 'what'
    ]);

    // 过滤停用词和短词
    words = words.filter(word => !stopWords.has(word) && word.length >= 2);

    // 生成2-3词的短语
    const phrases = [];
    for (let i = 0; i < words.length - 1; i++) {
      // 2词短语
      if (i + 1 < words.length) {
        phrases.push(words[i] + ' ' + words[i + 1]);
      }
      // 3词短语
      if (i + 2 < words.length) {
        phrases.push(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
      }
    }

    // 合并单词和短语
    const allWords = [...words, ...phrases];

    // 去重并过滤
    return [...new Set(allWords)].filter(word =>
      word.length >= 2 && /[a-zA-Z]/.test(word)
    );
  }

    // 计算文本相似度（简单的词汇重叠度）
  calculateSimilarity(query, text, language = 'auto') {
    const queryWords = this.tokenizeText(query.toLowerCase(), language);
    const textWords = this.tokenizeText(text.toLowerCase(), language);

    let matches = 0;
    let totalWords = queryWords.length;

    for (const word of queryWords) {
      if (textWords.some(textWord => textWord.includes(word) || word.includes(textWord))) {
        matches++;
      }
    }

    return totalWords > 0 ? matches / totalWords : 0;
  }

    // RAG检索函数
  async ragSearch(question, limit = 5, language = 'auto') {
    if (!this.env.SUPABASE_URL || !this.env.SUPABASE_SERVICE_KEY) {
      return {
        success: false,
        error: "数据库配置未完成"
      };
    }

    const startTime = Date.now();

    try {
      // 对问题进行分词
      const keywords = this.tokenizeText(question, language);
      console.log('🔍 RAG检索调试信息:');
      console.log('问题:', question);
      console.log('检测语言:', language);
      console.log('分词结果:', keywords);

      // 构建搜索查询 - 先尝试关键词匹配
      let queryParams = 'select=*&order=created_at.desc&limit=200'; // 先获取较多数据用于排序

      const response = await fetch(
        `${this.env.SUPABASE_URL}/rest/v1/cleaned_data?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${this.env.SUPABASE_SERVICE_KEY}`,
            'apikey': this.env.SUPABASE_ANON_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`数据库查询失败: ${response.status}`);
      }

      const data = await response.json();

      // 对结果进行相关性排序
      const scoredResults = [];

      for (const record of data) {
        if (!record.cleaned_data?.chunks) continue;

        for (const chunk of record.cleaned_data.chunks) {
          // 计算多个字段的相关性得分
          let score = 0;

                    // 搜索向量文本匹配（权重最高）
          if (chunk.search_vector) {
            score += this.calculateSimilarity(question, chunk.search_vector, language) * 3;
          }

          // 关键词匹配
          if (chunk.keywords && Array.isArray(chunk.keywords)) {
            const keywordText = chunk.keywords.join(' ');
            score += this.calculateSimilarity(question, keywordText, language) * 2;
          }

          // 摘要匹配
          if (chunk.summary) {
            score += this.calculateSimilarity(question, chunk.summary, language) * 1.5;
          }

          // 原文匹配（权重较低）
          if (record.original_text) {
            score += this.calculateSimilarity(question, record.original_text, language) * 0.5;
          }

          // 只保留有一定相关性的结果
          if (score > 0.1) {
            scoredResults.push({
              score: score,
              content: chunk.search_vector || chunk.summary || '无内容',
              summary: chunk.summary || '无摘要',
              keywords: chunk.keywords || [],
              category: chunk.category || '未分类',
              source_id: record.id,
              created_at: record.created_at
            });
          }
        }
      }

      // 按相关性得分排序并取前N个
      const topResults = scoredResults
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      const searchTime = Date.now() - startTime;

      return {
        success: true,
        results: topResults,
        total_matches: scoredResults.length,
        search_time: searchTime,
        keywords_used: keywords.slice(0, 10) // 返回使用的关键词（限制数量）
      };

    } catch (error) {
      return {
        success: false,
        error: `RAG检索失败: ${error.message}`,
        search_time: Date.now() - startTime
      };
    }
  }

    // RAG对话方法
  async ragChat(question, systemPrompt, searchLimit = 5, language = 'auto') {
    const startTime = Date.now();

    // 检测语言（如果是auto）
    if (language === 'auto') {
      const chineseRatio = (question.match(/[\u4e00-\u9fa5]/g) || []).length / question.length;
      language = chineseRatio > 0.3 ? 'zh' : 'en';
    }

    try {
      // 1. 执行RAG检索
      const searchResult = await this.ragSearch(question, searchLimit, language);

      if (!searchResult.success) {
        return {
          success: false,
          error: searchResult.error
        };
      }

      const searchTime = searchResult.search_time;
      const aiStartTime = Date.now();

      // 2. 构建知识库上下文
      let knowledgeContext = '';
      if (searchResult.results.length > 0) {
        if (language === 'zh') {
          knowledgeContext = searchResult.results.map((result, index) => {
            return `知识片段${index + 1}：
分类：${result.category}
摘要：${result.summary}
内容：${result.content}
关键词：${result.keywords.join(', ')}
`;
          }).join('\n---\n');
        } else {
          knowledgeContext = searchResult.results.map((result, index) => {
            return `Knowledge Fragment ${index + 1}:
Category: ${result.category}
Summary: ${result.summary}
Content: ${result.content}
Keywords: ${result.keywords.join(', ')}
`;
          }).join('\n---\n');
        }
      } else {
                knowledgeContext = language === 'zh' ?
          '未找到相关的知识库内容。' :
          'No relevant content found in the knowledge base.';
      }

      // 3. 替换系统提示词中的占位符
      const finalPrompt = systemPrompt
        .replace('{KNOWLEDGE_CONTEXT}', knowledgeContext)
        .replace('{USER_QUESTION}', question);

      // 4. 调用AI API
      if (!this.env.AI_API_KEY) {
        return {
          success: false,
          error: "AI API密钥未配置"
        };
      }

      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.AI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V3',
          messages: [
            {
              role: 'system',
              content: finalPrompt
            },
            {
              role: 'user',
              content: question
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API请求失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const aiContent = result.choices?.[0]?.message?.content;

      if (!aiContent) {
        throw new Error('AI API返回内容为空');
      }

      const aiTime = Date.now() - aiStartTime;
      const totalTime = Date.now() - startTime;

      return {
        success: true,
        answer: aiContent,
        sources: searchResult.results.map(r => ({
          content: r.content,
          summary: r.summary,
          category: r.category,
          keywords: r.keywords
        })),
        stats: {
          search_time: searchTime,
          ai_time: aiTime,
          total_time: totalTime,
          total_matches: searchResult.total_matches,
          sources_used: searchResult.results.length,
          keywords_used: searchResult.keywords_used
        },
        usage: result.usage,
        model: result.model
      };

    } catch (error) {
      return {
        success: false,
        error: `RAG对话失败: ${error.message}`,
        stats: {
          search_time: 0,
          ai_time: 0,
          total_time: Date.now() - startTime,
          total_matches: 0,
          sources_used: 0
        }
      };
    }
  }
}

// 静态页面路由
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Cleaner</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 80px 0; }
        .card { border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 30px; }
    </style>
</head>
<body>
    <div class="hero">
        <div class="container text-center">
            <h1>🤖 Data Cleaner</h1>
            <p class="lead">AI 数据清洗工具</p>
        </div>
    </div>
    <div class="container py-5">
        <div class="row">
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body text-center">
                        <h3>📝 数据清洗</h3>
                        <p>使用 AI 智能清洗文本数据，转换为结构化格式</p>
                        <a href="/data_cleaner" class="btn btn-primary">开始清洗</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body text-center">
                        <h3>📊 数据管理</h3>
                        <p>查看、编辑和管理已清洗的数据记录</p>
                        <a href="/data_viewer" class="btn btn-success">查看数据</a>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card">
                    <div class="card-body text-center">
                        <h3>🤖 智能问答</h3>
                        <p>基于知识库的AI对话，RAG技术驱动的智能助手</p>
                        <a href="/chat" class="btn btn-info text-white">开始对话</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `)
})

app.get('/data_cleaner', (c) => {
  return c.redirect('/data_cleaner/')
})

app.get('/data_cleaner/', (c) => {
  return c.html(dataCleanerHTML)
})

app.get('/data_viewer', (c) => {
  return c.redirect('/data_viewer/')
})

app.get('/data_viewer/', (c) => {
  return c.html(dataViewerHTML)
})

// API 路由

// 获取默认提示词
app.get('/data_cleaner/get_default_prompt', async (c) => {
  const language = c.req.query('language') || 'en'
  const type = c.req.query('type') || 'cleaning' // 'cleaning' 或 'chat'
  const service = new DataCleanerService(c.env)

  let prompt;
  if (type === 'chat') {
    prompt = service.getDefaultChatPrompt(language)
  } else {
    prompt = service.getDefaultPrompt(language)
  }

  return c.json({
    success: true,
    prompt: prompt,
    language: language,
    type: type
  })
})

// 数据清洗
app.post('/data_cleaner/clean_data', async (c) => {
  try {
    const { text, system_prompt } = await c.req.json()

    if (!text?.trim()) {
      return c.json({
        success: false,
        error: "输入文本不能为空"
      }, 400)
    }

    const service = new DataCleanerService(c.env)
    const result = await service.cleanData(text, system_prompt)

    return c.json(result)
  } catch (error) {
    return c.json({
      success: false,
      error: `请求处理失败: ${error.message}`
    }, 500)
  }
})

// 图片识别清洗
app.post('/data_cleaner/clean_image', async (c) => {
  try {
    const { image, system_prompt } = await c.req.json()

    if (!image) {
      return c.json({
        success: false,
        error: "图片数据不能为空"
      }, 400)
    }

    const service = new DataCleanerService(c.env)
    const result = await service.cleanImage(image, system_prompt)

    return c.json(result)
  } catch (error) {
    return c.json({
      success: false,
      error: `图片处理失败: ${error.message}`
    }, 500)
  }
})

// 保存数据
app.post('/data_cleaner/save_data', async (c) => {
  try {
    const { original_text, cleaned_data, content_type = 'text', original_image } = await c.req.json()

    if (!cleaned_data) {
      return c.json({
        success: false,
        error: "缺少清洗后的数据"
      }, 400)
    }

    if (!original_text && content_type === 'text') {
      return c.json({
        success: false,
        error: "文本模式下缺少原始文本"
      }, 400)
    }

    const service = new DataCleanerService(c.env)
    const result = await service.saveData(original_text, cleaned_data, content_type, original_image)

    return c.json(result)
  } catch (error) {
    return c.json({
      success: false,
      error: `保存失败: ${error.message}`
    }, 500)
  }
})

// 获取数据列表
app.get('/data_cleaner/data_list', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit')) || 10
    const offset = parseInt(c.req.query('offset')) || 0

    const service = new DataCleanerService(c.env)
    const result = await service.getDataList(limit, offset)

    return c.json(result)
  } catch (error) {
    return c.json({
      success: false,
      error: `获取数据失败: ${error.message}`
    }, 500)
  }
})

// 获取单条数据详情
app.get('/data_cleaner/data/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const service = new DataCleanerService(c.env)
    const result = await service.getDataById(id)

    return c.json(result)
  } catch (error) {
    return c.json({
      success: false,
      error: `获取数据失败: ${error.message}`
    }, 500)
  }
})

// 更新数据
app.put('/data_cleaner/data/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { cleaned_data } = await c.req.json()

    const service = new DataCleanerService(c.env)
    const result = await service.updateData(id, cleaned_data)

    return c.json(result)
  } catch (error) {
    return c.json({
      success: false,
      error: `更新失败: ${error.message}`
    }, 500)
  }
})

// 删除数据
app.delete('/data_cleaner/data/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const service = new DataCleanerService(c.env)
    const result = await service.deleteData(id)

    return c.json(result)
  } catch (error) {
    return c.json({
      success: false,
      error: `删除失败: ${error.message}`
    }, 500)
  }
})

// RAG对话API
app.post('/chat/ask', async (c) => {
  try {
    const { question, system_prompt, language } = await c.req.json()

    if (!question?.trim()) {
      return c.json({
        success: false,
        error: language === 'zh' ? "问题不能为空" : "Question cannot be empty"
      }, 400)
    }

    const service = new DataCleanerService(c.env)

    // 检测语言（如果没有提供）
    const detectedLanguage = language || 'auto'

    // 使用默认系统提示词（如果没有提供）
    const finalSystemPrompt = system_prompt?.trim() || service.getDefaultChatPrompt(detectedLanguage);

    const result = await service.ragChat(question, finalSystemPrompt, 5, detectedLanguage);

    return c.json(result)
  } catch (error) {
    return c.json({
      success: false,
      error: `对话处理失败: ${error.message}`
    }, 500)
  }
})

// 聊天页面路由
app.get('/chat', (c) => {
  return c.redirect('/chat/')
})

app.get('/chat/', (c) => {
  return c.html(chatHTML)
})

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

export default app