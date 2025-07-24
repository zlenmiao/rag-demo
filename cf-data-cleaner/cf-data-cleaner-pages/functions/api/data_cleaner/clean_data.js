// Pages Function: 文本数据清洗
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
    const { text, system_prompt } = await request.json();

    if (!text?.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: "输入文本不能为空"
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

    // 构建请求消息
    const messages = [
      {
        role: "system",
        content: system_prompt
      },
      {
        role: "user",
        content: `请对以下文本进行清洗和结构化处理：\n\n${text}`
      }
    ];

    // 调用AI API
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`AI API请求失败: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;

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
      return new Response(JSON.stringify({
        success: false,
        error: "AI返回的不是有效的JSON格式",
        raw_content: content
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `AI调用失败: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}