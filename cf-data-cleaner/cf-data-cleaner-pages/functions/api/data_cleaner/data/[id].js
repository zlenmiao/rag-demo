// Pages Function: 根据ID获取单个数据记录
export async function onRequest(context) {
  const { request, env, params } = context;

  // 处理CORS预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
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

    const recordId = params.id;

    if (!recordId || isNaN(parseInt(recordId))) {
      return new Response(JSON.stringify({
        success: false,
        error: "无效的记录ID"
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    if (request.method === 'GET') {
      // 获取单个记录
      const response = await fetch(
        `${env.SUPABASE_URL}/rest/v1/cleaned_data?id=eq.${recordId}`,
        {
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': env.SUPABASE_ANON_KEY
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`获取数据失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: "记录不存在"
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: data[0]
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } else if (request.method === 'PUT') {
      // 更新记录
      const { cleaned_data, original_text } = await request.json();

      if (!cleaned_data) {
        return new Response(JSON.stringify({
          success: false,
          error: "清洗数据不能为空"
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      const response = await fetch(
        `${env.SUPABASE_URL}/rest/v1/cleaned_data?id=eq.${recordId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_ANON_KEY,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            cleaned_data: cleaned_data,
            original_text: original_text,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`更新数据失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      return new Response(JSON.stringify({
        success: true,
        data: result[0],
        message: "数据更新成功"
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } else if (request.method === 'DELETE') {
      // 删除记录
      const response = await fetch(
        `${env.SUPABASE_URL}/rest/v1/cleaned_data?id=eq.${recordId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': env.SUPABASE_ANON_KEY
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`删除数据失败: ${response.status} - ${errorText}`);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "数据删除成功"
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } else {
      return new Response('Method not allowed', { status: 405 });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}