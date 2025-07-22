import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

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
          max_tokens: 4000,
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

  async saveData(originalText, cleanedData) {
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
    <title>CF Data Cleaner</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 80px 0; }
        .card { border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.1); margin-bottom: 30px; }
    </style>
</head>
<body>
    <div class="hero">
        <div class="container text-center">
            <h1>🤖 CF Data Cleaner</h1>
            <p class="lead">基于 Cloudflare Workers 的 AI 数据清洗工具</p>
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
  return c.html(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI数据清洗工具</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .container-fluid { max-width: 1200px; }
        .card { border: none; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .btn-action { margin: 5px; border-radius: 25px; padding: 10px 25px; font-weight: bold; }
        .content-area { height: 300px; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; overflow-y: auto; background: #ffffff; }
        .original-content { background: #f8f9fa; }
        .cleaned-content { background: #e8f5e8; }
        .chunk-item { background: #ffffff; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
        .keyword-tag { background: #007bff; color: white; padding: 2px 6px; border-radius: 12px; font-size: 11px; margin-right: 4px; }
        .chunk-category { background: #28a745; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; display: inline-block; margin-bottom: 5px; }
        .loading { display: none; }
        .status-message { margin-top: 10px; padding: 10px; border-radius: 5px; display: none; }
        .status-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    </style>
</head>
<body class="bg-light">
    <div class="container-fluid py-4">
        <div class="row mb-4">
            <div class="col-12">
                <h1 class="text-center text-primary"><i class="fas fa-magic"></i> AI数据清洗工具</h1>
                <p class="text-center text-muted">智能化数据清洗，高质量RAG知识库构建</p>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header"><h5><i class="fas fa-edit"></i> 文本输入区域</h5></div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label for="textInput" class="form-label">请输入要清洗的文本内容：</label>
                            <textarea class="form-control" id="textInput" rows="6" placeholder="在这里粘贴或输入需要清洗的文本内容..."></textarea>
                        </div>
                        <div class="d-flex justify-content-end mt-3">
                            <button class="btn btn-primary btn-action" id="cleanBtn" disabled><i class="fas fa-broom"></i> 数据清洗</button>
                            <button class="btn btn-success btn-action" id="saveBtn" disabled><i class="fas fa-database"></i> 保存到数据库</button>
                            <a href="/data_viewer/" class="btn btn-info btn-action"><i class="fas fa-eye"></i> 查看数据</a>
                        </div>
                        <div class="status-message" id="statusMessage"></div>
                        <div class="loading" id="loadingIndicator">
                            <div class="d-flex align-items-center">
                                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                                <span>AI正在处理中，请稍候...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-6">
                <div class="card h-100">
                    <div class="card-header"><h5><i class="fas fa-file-alt"></i> 原文</h5></div>
                    <div class="card-body">
                        <div class="content-area original-content" id="originalContent">
                            <p class="text-muted text-center">这里是原文区域</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-6">
                <div class="card h-100">
                    <div class="card-header"><h5><i class="fas fa-sparkles"></i> 清洗结果</h5></div>
                    <div class="card-body">
                        <div class="content-area cleaned-content" id="cleanedContent">
                            <p class="text-muted text-center">这里是清洗后的数据展示结果</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5><i class="fas fa-cog"></i> System Prompt 配置</h5>
                        <button class="btn btn-sm btn-outline-primary" id="resetPromptBtn"><i class="fas fa-undo"></i> 重置默认</button>
                    </div>
                    <div class="card-body">
                        <textarea class="form-control" id="systemPrompt" rows="8" placeholder="在这里编辑数据清洗的System Prompt..." style="font-family: monospace; font-size: 12px;">正在加载默认提示词...</textarea>
                        <small class="form-text text-muted mt-2"><i class="fas fa-info-circle"></i> 修改此提示词可以调整AI的数据清洗策略和输出格式</small>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let originalText = '', cleanedData = null, defaultPrompt = '';
        const API_BASE_URL = 'https://cf-data-cleaner.coder-zlen.workers.dev';

        const textInput = document.getElementById('textInput');
        const originalContent = document.getElementById('originalContent');
        const cleanedContent = document.getElementById('cleanedContent');
        const cleanBtn = document.getElementById('cleanBtn');
        const saveBtn = document.getElementById('saveBtn');
        const systemPrompt = document.getElementById('systemPrompt');
        const resetPromptBtn = document.getElementById('resetPromptBtn');
        const statusMessage = document.getElementById('statusMessage');
        const loadingIndicator = document.getElementById('loadingIndicator');

        document.addEventListener('DOMContentLoaded', function() {
            loadDefaultPrompt();
            setupEventListeners();
        });

        function setupEventListeners() {
            textInput.addEventListener('input', function() {
                const text = this.value.trim();
                if (text) {
                    displayOriginalText(text);
                    cleanBtn.disabled = false;
                } else {
                    cleanBtn.disabled = true;
                }
            });
            cleanBtn.addEventListener('click', performDataCleaning);
            saveBtn.addEventListener('click', saveToDatabase);
            resetPromptBtn.addEventListener('click', resetPrompt);
        }

        function displayOriginalText(text) {
            originalText = text;
            originalContent.innerHTML = '<pre style="white-space: pre-wrap; font-family: inherit;">' + escapeHtml(text) + '</pre>';
        }

        async function loadDefaultPrompt() {
            try {
                const response = await fetch(API_BASE_URL + '/data_cleaner/get_default_prompt');
                const data = await response.json();
                if (data.success) {
                    defaultPrompt = data.prompt;
                    systemPrompt.value = defaultPrompt;
                }
            } catch (error) {
                console.error('加载默认提示词失败:', error);
            }
        }

        async function performDataCleaning() {
            const text = textInput.value.trim();
            if (!text) {
                showStatus('请输入文本内容', 'error');
                return;
            }

            const prompt = systemPrompt.value.trim();
            if (!prompt) {
                showStatus('请配置System Prompt', 'error');
                return;
            }

            showLoading(true);
            cleanBtn.disabled = true;

            try {
                const response = await fetch(API_BASE_URL + '/data_cleaner/clean_data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text, system_prompt: prompt })
                });

                const result = await response.json();
                if (result.success) {
                    cleanedData = result.cleaned_data;
                    displayCleanedData(cleanedData);
                    saveBtn.disabled = false;
                    showStatus('数据清洗完成', 'success');
                } else {
                    showStatus('数据清洗失败: ' + result.error, 'error');
                }
            } catch (error) {
                showStatus('请求失败: ' + error.message, 'error');
            } finally {
                showLoading(false);
                cleanBtn.disabled = false;
            }
        }

        function displayCleanedData(data) {
            if (!data || !data.chunks) {
                cleanedContent.innerHTML = '<p class="text-danger">清洗数据格式错误</p>';
                return;
            }

            let html = '';
            data.chunks.forEach((chunk, index) => {
                html += '<div class="chunk-item">';
                html += '<div><strong>段落 ' + (index + 1) + '</strong></div>';
                html += '<div style="font-weight: bold; color: #007bff; margin-bottom: 5px;">' + escapeHtml(chunk.summary || '') + '</div>';
                html += '<div style="margin-bottom: 5px;">';
                (chunk.keywords || []).forEach(kw => {
                    html += '<span class="keyword-tag">' + escapeHtml(kw) + '</span>';
                });
                html += '</div>';
                html += '<div class="chunk-category">' + escapeHtml(chunk.category || '') + '</div>';
                html += '<div style="font-size: 12px; color: #6c757d; font-style: italic;">' + escapeHtml(chunk.search_vector || '') + '</div>';
                html += '</div>';
            });

            cleanedContent.innerHTML = html;
        }

        async function saveToDatabase() {
            if (!cleanedData) {
                showStatus('没有清洗后的数据可保存', 'error');
                return;
            }

            showLoading(true);
            saveBtn.disabled = true;

            try {
                const response = await fetch(API_BASE_URL + '/data_cleaner/save_data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ original_text: originalText, cleaned_data: cleanedData })
                });

                const result = await response.json();
                if (result.success) {
                    showStatus('数据保存成功，记录ID: ' + result.record_id, 'success');
                } else {
                    showStatus('数据保存失败: ' + result.error, 'error');
                }
            } catch (error) {
                showStatus('请求失败: ' + error.message, 'error');
            } finally {
                showLoading(false);
                saveBtn.disabled = false;
            }
        }

        function resetPrompt() {
            systemPrompt.value = defaultPrompt;
            showStatus('已重置为默认提示词', 'success');
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showStatus(message, type) {
            statusMessage.textContent = message;
            statusMessage.className = 'status-message status-' + type;
            statusMessage.style.display = 'block';
            if (type === 'success') {
                setTimeout(() => hideStatus(), 3000);
            }
        }

        function hideStatus() {
            statusMessage.style.display = 'none';
        }

        function showLoading(show) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    </script>
</body>
</html>
  `)
})

app.get('/data_viewer', (c) => {
  return c.redirect('/data_viewer/')
})

app.get('/data_viewer/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>清洗数据查看器</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background-color: #f8f9fa; }
        .header-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px; padding: 30px; margin-bottom: 30px; }
        .stats-card { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .stats-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .data-table { background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .table-header { background: #f8f9fa; padding: 20px; border-bottom: 1px solid #dee2e6; }
        .loading { text-align: center; padding: 40px; color: #6c757d; }
        .empty-state { text-align: center; padding: 60px 20px; color: #6c757d; }
        .action-btn { padding: 5px 10px; margin: 2px; border-radius: 5px; border: none; cursor: pointer; font-size: 12px; }
        .btn-view { background: #17a2b8; color: white; }
        .btn-delete { background: #dc3545; color: white; }
    </style>
</head>
<body>
    <div class="container-fluid py-4">
        <div class="header-card">
            <h1 class="mb-2"><i class="fas fa-database"></i> 清洗数据查看器</h1>
            <p class="mb-0">查看和管理AI数据清洗结果 - Supabase数据库</p>
        </div>

        <div class="row mb-4" id="statsRow">
            <div class="col-md-3">
                <div class="stats-card text-center">
                    <div class="stats-number" id="totalRecords">-</div>
                    <div class="text-muted">总记录数</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card text-center">
                    <div class="stats-number" id="recentRecords">-</div>
                    <div class="text-muted">最近7天</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card text-center">
                    <div class="stats-number" id="avgTextLength">-</div>
                    <div class="text-muted">平均文本长度</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stats-card text-center">
                    <div class="stats-number" id="storageSize">-</div>
                    <div class="text-muted">数据库大小(MB)</div>
                </div>
            </div>
        </div>

        <div class="data-table">
            <div class="table-header">
                <div class="row align-items-center">
                    <div class="col-md-6">
                        <h5 class="mb-0"><i class="fas fa-list"></i> 清洗数据列表 <span class="badge bg-primary">Supabase数据库</span></h5>
                    </div>
                    <div class="col-md-6">
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-outline-primary btn-sm" onclick="refreshData()"><i class="fas fa-refresh"></i> 刷新</button>
                            <a href="/data_cleaner/" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> 清洗数据</a>
                        </div>
                    </div>
                </div>
            </div>

            <div id="loadingIndicator" class="loading">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="mt-2">正在加载数据...</div>
            </div>

            <div id="dataContainer" style="display: none;">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="table-light">
                            <tr>
                                <th width="8%">ID</th>
                                <th width="40%">原文预览</th>
                                <th width="30%">清洗结果</th>
                                <th width="15%">创建时间</th>
                                <th width="7%">操作</th>
                            </tr>
                        </thead>
                        <tbody id="dataTableBody"></tbody>
                    </table>
                </div>
            </div>

            <div id="emptyState" class="empty-state" style="display: none;">
                <i class="fas fa-inbox fa-3x mb-3 text-muted"></i>
                <h5>暂无数据</h5>
                <p class="text-muted">数据库中没有清洗后的数据</p>
                <a href="/data_cleaner/" class="btn btn-primary"><i class="fas fa-plus"></i> 去清洗数据</a>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        let currentPage = 1, pageSize = 10, totalRecords = 0;
        const API_BASE_URL = 'https://cf-data-cleaner.coder-zlen.workers.dev';

        const dataTableBody = document.getElementById('dataTableBody');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const dataContainer = document.getElementById('dataContainer');
        const emptyState = document.getElementById('emptyState');

        document.addEventListener('DOMContentLoaded', function() {
            loadData();
        });

        async function loadData() {
            showLoading();
            try {
                const response = await fetch(API_BASE_URL + '/data_cleaner/data_list?limit=' + pageSize + '&offset=' + ((currentPage - 1) * pageSize));
                const result = await response.json();

                if (result.success) {
                    updateStatistics(result.statistics);
                    displayData(result.data);
                    totalRecords = result.statistics?.total_records || 0;
                } else {
                    showError(result.error || '加载数据失败');
                }
            } catch (error) {
                showError('网络请求失败: ' + error.message);
            }
        }

        function updateStatistics(stats) {
            document.getElementById('totalRecords').textContent = stats.total_records || 0;
            document.getElementById('recentRecords').textContent = stats.recent_records || 0;
            document.getElementById('avgTextLength').textContent = Math.round(stats.avg_text_length || 0);
            document.getElementById('storageSize').textContent = stats.file_size || 0;
        }

        function displayData(data) {
            if (!data || data.length === 0) {
                showEmptyState();
                return;
            }

            let html = '';
            data.forEach(record => {
                const chunks = record.cleaned_data?.chunks || [];
                const firstChunk = chunks[0] || {};

                html += '<tr>';
                html += '<td><strong>#' + record.id + '</strong></td>';
                html += '<td><div style="max-height: 80px; overflow-y: auto; font-size: 12px;">';
                html += escapeHtml(record.original_text?.substring(0, 200) || '');
                html += (record.original_text?.length || 0) > 200 ? '...' : '';
                html += '</div></td>';
                html += '<td><div style="font-size: 11px;">';
                html += '<div><strong>摘要:</strong> ' + escapeHtml(firstChunk.summary || '') + '</div>';
                html += '<div><strong>分类:</strong> <span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px;">' + escapeHtml(firstChunk.category || '') + '</span></div>';
                html += chunks.length > 1 ? '<div class="text-muted">+' + (chunks.length - 1) + ' 个段落</div>' : '';
                html += '</div></td>';
                html += '<td><small>' + formatDate(record.created_at) + '</small></td>';
                html += '<td>';
                html += '<button class="action-btn btn-view" onclick="viewRecord(' + record.id + ')" title="查看详情"><i class="fas fa-eye"></i></button>';
                html += '<button class="action-btn btn-delete" onclick="deleteRecord(' + record.id + ')" title="删除"><i class="fas fa-trash"></i></button>';
                html += '</td>';
                html += '</tr>';
            });

            dataTableBody.innerHTML = html;
            showDataContainer();
        }

        function showLoading() {
            loadingIndicator.style.display = 'block';
            dataContainer.style.display = 'none';
            emptyState.style.display = 'none';
        }

        function showDataContainer() {
            loadingIndicator.style.display = 'none';
            dataContainer.style.display = 'block';
            emptyState.style.display = 'none';
        }

        function showEmptyState() {
            loadingIndicator.style.display = 'none';
            dataContainer.style.display = 'none';
            emptyState.style.display = 'block';
        }

        function showError(message) {
            showEmptyState();
            const emptyStateElement = document.getElementById('emptyState');
            emptyStateElement.innerHTML = '<i class="fas fa-exclamation-triangle fa-3x mb-3 text-warning"></i><h5>加载失败</h5><p class="text-muted">' + escapeHtml(message) + '</p><button class="btn btn-primary" onclick="loadData()"><i class="fas fa-refresh"></i> 重试</button>';
        }

        async function viewRecord(id) {
            try {
                const response = await fetch(API_BASE_URL + '/data_cleaner/data/' + id);
                const result = await response.json();
                if (result.success) {
                    alert('记录 #' + id + '\\n\\n原文: ' + result.data.original_text.substring(0, 200) + '...\\n\\n清洗结果: ' + result.data.cleaned_data.chunks.length + ' 个段落');
                } else {
                    alert('获取详情失败: ' + result.error);
                }
            } catch (error) {
                alert('网络请求失败: ' + error.message);
            }
        }

        async function deleteRecord(id) {
            if (!confirm('确定要删除这条记录吗？删除后无法恢复。')) return;
            try {
                const response = await fetch(API_BASE_URL + '/data_cleaner/data/' + id, { method: 'DELETE' });
                const result = await response.json();
                if (result.success) {
                    alert('删除成功');
                    loadData();
                } else {
                    alert('删除失败: ' + result.error);
                }
            } catch (error) {
                alert('网络请求失败: ' + error.message);
            }
        }

        function refreshData() {
            loadData();
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatDate(dateString) {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN');
        }
    </script>
</body>
</html>
  `)
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

// 保存数据
app.post('/data_cleaner/save_data', async (c) => {
  try {
    const { original_text, cleaned_data } = await c.req.json()

    if (!original_text || !cleaned_data) {
      return c.json({
        success: false,
        error: "缺少必要的数据"
      }, 400)
    }

    const service = new DataCleanerService(c.env)
    const result = await service.saveData(original_text, cleaned_data)

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