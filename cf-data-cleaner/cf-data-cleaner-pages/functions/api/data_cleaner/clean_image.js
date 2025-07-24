// Pages Function: 图片内容识别
export async function onRequest(context) {
  const { request, env } = context;

  // 处理CORS预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  // 仅允许POST请求
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { image, system_prompt } = await request.json();

    if (!image) {
      return new Response(JSON.stringify({
        success: false,
        error: "图片数据不能为空"
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 检查AI API密钥
    if (!env.AI_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: "AI API密钥未配置"
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 默认提示词
    const defaultPrompt = `你是一个专业的数据清洗和结构化专家，专门负责将原始文本数据清洗并转换为结构化的RAG知识库格式。

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

请严格按照上述要求处理输入文本，确保输出的JSON格式正确且内容质量高。`;

    const prompt = system_prompt || defaultPrompt;

    // 确保图片数据是正确的data URI格式
    let processedImageUrl = image;
    if (!image.startsWith('data:image/')) {
      // 如果不是完整的data URI，假设是base64并添加前缀
      processedImageUrl = `data:image/jpeg;base64,${image}`;
    }

    const requestBody = {
      model: 'deepseek-ai/deepseek-vl2',
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

    // 调用AI API
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('VLM API错误响应:', errorText);
      throw new Error(`AI API请求失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('VLM API返回内容为空');
    }

    // 清理JSON格式
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    try {
      const cleanedData = JSON.parse(cleanContent);

      return new Response(JSON.stringify({
        success: true,
        cleaned_data: cleanedData,
        usage: result.usage,
        model: result.model
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (parseError) {
      // 如果不是有效JSON，返回简单格式
      return new Response(JSON.stringify({
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
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `图片识别失败: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}