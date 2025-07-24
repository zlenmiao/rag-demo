// Pages Function: 获取清洗数据列表
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

  // 仅允许GET请求
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
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

    // 解析查询参数
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const search = url.searchParams.get('search') || '';

    // 构建查询条件
    let queryParams = `select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
    if (search.trim()) {
      queryParams += `&original_text=ilike.*${encodeURIComponent(search)}*`;
    }

    // 获取数据列表
    const dataResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cleaned_data?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'apikey': env.SUPABASE_ANON_KEY
        }
      }
    );

    // 获取总数
    let countQueryParams = `select=count&head=true`;
    if (search.trim()) {
      countQueryParams += `&original_text=ilike.*${encodeURIComponent(search)}*`;
    }

    const countResponse = await fetch(
      `${env.SUPABASE_URL}/rest/v1/cleaned_data?${countQueryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'apikey': env.SUPABASE_ANON_KEY,
          'Prefer': 'count=exact'
        }
      }
    );

    if (!dataResponse.ok) {
      const errorText = await dataResponse.text();
      throw new Error(`获取数据失败: ${dataResponse.status} - ${errorText}`);
    }

    const data = await dataResponse.json();
    const totalCount = parseInt(countResponse.headers.get('content-range')?.split('/')[1]) || 0;

    // 计算统计信息
    const statistics = {
      total_records: totalCount,
      recent_records: data.filter(record => {
        const createdAt = new Date(record.created_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return createdAt > weekAgo;
      }).length,
      avg_text_length: data.length > 0
        ? Math.round(data.reduce((sum, record) => sum + (record.original_text?.length || 0), 0) / data.length)
        : 0,
      file_size: Math.round(totalCount * 2 / 1024) // 估算大小 KB -> MB
    };

    return new Response(JSON.stringify({
      success: true,
      data: data,
      statistics: statistics,
      pagination: {
        limit: limit,
        offset: offset,
        total: totalCount,
        hasMore: offset + limit < totalCount
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `获取数据失败: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}