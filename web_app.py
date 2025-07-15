#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Flask Web应用
"""

import json
import logging
from flask import Flask, request, jsonify, render_template, Response
from rag_system import AdvancedRAGSystem
# 暂时注释掉OCR导入，避免numpy版本冲突
# from image_processor import process_single_image, process_batch_images

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this'
rag_system = AdvancedRAGSystem()

@app.route('/')
def index():
    """主页"""
    return render_template('index.html')

@app.route('/build', methods=['POST'])
def build_knowledge_base():
    """构建知识库API"""
    try:
        data = request.json
        data_dir = data.get('data_dir')

        if not data_dir:
            return jsonify({"success": False, "message": "请提供数据目录路径"})

        result = rag_system.build_knowledge_base(data_dir)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route('/query', methods=['POST'])
def query():
    """智能查询API"""
    try:
        data = request.json
        query_text = data.get('query')
        session_id = data.get('session_id')

        if not query_text:
            return jsonify({"success": False, "message": "请提供查询内容"})

        result = rag_system.intelligent_query(query_text, session_id)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route('/query_stream', methods=['POST'])
def query_stream():
    """流式查询API"""
    try:
        data = request.json
        query_text = data.get('query')
        session_id = data.get('session_id')

        if not query_text:
            def error_stream():
                yield f"data: {json.dumps({'error': '请提供查询内容'})}\n\n"
            return Response(error_stream(), mimetype='text/plain')

        def generate():
            try:
                # 直接使用intelligent_query_stream方法处理流式响应
                for chunk in rag_system.intelligent_query_stream(query_text, session_id):
                    # 确保内容是正确的UTF-8字符串
                    try:
                        if "data" in chunk and "content" in chunk["data"]:
                            content = chunk["data"]["content"]
                            if isinstance(content, str):
                                chunk["data"]["content"] = content
                            elif isinstance(content, bytes):
                                chunk["data"]["content"] = content.decode('utf-8', errors='replace')

                        # 序列化为JSON，确保中文字符正确处理
                        json_str = json.dumps(chunk, ensure_ascii=False)
                        yield f"data: {json_str}\n\n"

                    except Exception as e:
                        logger.error(f"处理数据块时发生编码错误: {e}")
                        continue

            except Exception as e:
                logger.error(f"流式查询错误: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return Response(generate(), mimetype='text/plain')

    except Exception as e:
        logger.error(f"流式查询API错误: {e}")
        def error_stream():
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        return Response(error_stream(), mimetype='text/plain')

@app.route('/stats')
def stats():
    """获取系统状态"""
    try:
        stats = rag_system.get_system_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/test_api')
def test_api():
    """测试API连接"""
    try:
        # 测试向量存储
        vector_status = "正常" if rag_system.vector_store.embeddings else "未初始化"

        # 测试LLM客户端
        llm_status = "正常" if rag_system.llm_client else "未初始化"

        return jsonify({
            "success": True,
            "vector_store": vector_status,
            "llm_client": llm_status,
            "timestamp": json.dumps(None, default=str)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/test_stream')
def test_stream():
    """测试流式输出"""
    def generate():
        for i in range(5):
            yield f"data: 测试消息 {i+1}\n\n"
            import time
            time.sleep(1)

    return Response(generate(), mimetype='text/plain')

# 暂时注释掉OCR相关的API端点
# @app.route('/ocr_single', methods=['POST'])
# def ocr_single():
#     """单张图片OCR识别API"""
#     try:
#         if 'file' not in request.files:
#             return jsonify({"success": False, "error": "未找到文件"})

#         file = request.files['file']
#         if file.filename == '':
#             return jsonify({"success": False, "error": "文件名为空"})

#         # 读取文件数据
#         image_data = file.read()

#         # 处理图片
#         result = process_single_image(image_data, file.filename)

#         return jsonify(result)

#     except Exception as e:
#         logger.error(f"单张图片OCR处理错误: {e}")
#         return jsonify({"success": False, "error": str(e)})

# @app.route('/ocr_batch', methods=['POST'])
# def ocr_batch():
#     """批量图片OCR识别API"""
#     try:
#         if 'files' not in request.files:
#             return jsonify({"success": False, "error": "未找到文件"})

#         files = request.files.getlist('files')
#         if not files:
#             return jsonify({"success": False, "error": "文件列表为空"})

#         # 准备批量处理的数据
#         image_files = []
#         for file in files:
#             if file.filename != '':
#                 image_data = file.read()
#                 image_files.append({
#                     'data': image_data,
#                     'filename': file.filename
#                 })

#         if not image_files:
#             return jsonify({"success": False, "error": "没有有效的图片文件"})

#         # 批量处理
#         result = process_batch_images(image_files)

#         return jsonify({
#             "success": True,
#             "data": result
#         })

#     except Exception as e:
#         logger.error(f"批量图片OCR处理错误: {e}")
#         return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    print("🌊 流式RAG+LLM知识库系统启动中...")
    print("=" * 60)
    print("✨ 流式输出特性:")
    print("  ⚡ 实时AI响应 - 逐字显示如ChatGPT")
    print("  🔍 智能向量检索 - 高质量文档匹配")
    print("  🧠 多种LLM支持 - OpenAI/DeepSeek/智谱AI等")
    print("  💬 连续对话管理 - 上下文记忆能力")
    print("  📊 质量评估 - 实时置信度和来源分析")
    print("  🎯 状态反馈 - 完整的处理进度展示")
    print("  🌐 现代界面 - 流畅动画和视觉效果")
    print("  📸 图片文字识别 - 暂时禁用（依赖问题）")
    print("=" * 60)
    print("🌐 请在浏览器中访问: http://localhost:5000")
    print("⚙️  请先在代码中配置您的AI API密钥")
    print("🎉 体验流式输出：提问后看AI实时思考回答！")
    print("⚠️  OCR功能暂时禁用，正在解决依赖冲突...")
    print("=" * 60)

    app.run(host="0.0.0.0", port=5000, debug=True)