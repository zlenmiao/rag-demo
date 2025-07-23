import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { dataCleanerHTML } from './templates/data_cleaner.js'
import { dataViewerHTML } from './templates/data_viewer.js'

const app = new Hono()

// 中间件
app.use('/*', cors())
app.use('/*', logger())

// 数据清洗服务类
class DataCleanerService {
  constructor(env) {
    this.env = env
  }

  getDefaultPrompt() {
    return `你是一个专业的数据清洗和结构化专家，专门负责将原始文本数据清洗并转换为结构化的RAG知识库格式。

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

请严格按照上述要求处理输入文本，确保输出的JSON格式正确且内容质量高。`
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
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body text-center">
                        <h3>📝 数据清洗</h3>
                        <p>使用 AI 智能清洗文本数据，转换为结构化格式</p>
                        <a href="/data_cleaner" class="btn btn-primary">开始清洗</a>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card">
                    <div class="card-body text-center">
                        <h3>📊 数据管理</h3>
                        <p>查看、编辑和管理已清洗的数据记录</p>
                        <a href="/data_viewer" class="btn btn-success">查看数据</a>
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
  const service = new DataCleanerService(c.env)
  const prompt = service.getDefaultPrompt()

  return c.json({
    success: true,
    prompt: prompt
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

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

export default app