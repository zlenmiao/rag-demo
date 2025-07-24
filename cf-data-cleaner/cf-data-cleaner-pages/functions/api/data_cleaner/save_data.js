// Pages Function: 保存清洗数据到数据库
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
    const {
      original_text,
      cleaned_data,
      content_type = 'text',
      original_image = null
    } = await request.json();

    if (!original_text || !cleaned_data) {
      return new Response(JSON.stringify({
        success: false,
        error: "原文和清洗数据不能为空"
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 检查数据库配置
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
      return new Response(JSON.stringify({
        success: false,
        error: "数据库配置未完成"
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 保存到数据库
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/cleaned_data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_ANON_KEY,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        original_text: original_text,
        cleaned_data: cleaned_data,
        content_type: content_type,
        image_data: original_image, // 存储Base64图片数据
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`数据库保存失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      record_id: result[0]?.id,
      storage_type: 'database'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `保存失败: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}