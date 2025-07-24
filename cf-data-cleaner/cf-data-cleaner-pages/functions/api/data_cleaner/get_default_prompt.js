// Pages Function: 获取默认提示词
export async function onRequest(context) {
  const { request, env } = context;

  // 仅允许GET请求
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
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

  // 返回JSON响应
  return new Response(JSON.stringify({
    success: true,
    prompt: defaultPrompt
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}