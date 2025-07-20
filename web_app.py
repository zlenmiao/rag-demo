#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Flask Web应用
"""

import json
import logging
from flask import Flask, request, jsonify, render_template, Response
from rag_system import AdvancedRAGSystem
from image_processor import process_single_image, process_batch_images
from data_cleaner.routes import data_cleaner_bp

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-this'
rag_system = AdvancedRAGSystem()

# 注册数据清洗模块蓝图
app.register_blueprint(data_cleaner_bp)

@app.route('/')
def index():
    """主页"""
    return render_template('index.html')

@app.route('/knowledge_base')
def knowledge_base_view():
    """知识库数据展示页面"""
    return render_template('knowledge_base.html')

@app.route('/api/knowledge_base_data')
def get_knowledge_base_data():
    """获取知识库数据API"""
    try:
        # 获取基本统计信息
        stats = rag_system.get_system_stats()

        # 获取文档详细信息
        documents_info = []
        for doc_id, document in rag_system.vector_store.documents.items():
            doc_info = {
                'id': document.id,
                'title': document.title,
                'content_length': len(document.content),
                'paragraphs_count': len(document.paragraphs),
                'created_at': document.created_at.strftime('%Y-%m-%d %H:%M:%S') if document.created_at else 'Unknown',
                'metadata': document.metadata,
                'preview': document.content[:200] + '...' if len(document.content) > 200 else document.content
            }
            documents_info.append(doc_info)

        # 获取段落统计信息
        paragraphs_info = []
        for i, metadata in enumerate(rag_system.vector_store.paragraph_metadata):
            if i < len(rag_system.vector_store.quality_scores):
                quality_score = rag_system.vector_store.quality_scores[i]
            else:
                quality_score = 0.0

            para_info = {
                'index': i,
                'doc_id': metadata.get('doc_id', 'Unknown'),
                'paragraph_index': metadata.get('paragraph_index', 0),
                'quality_score': round(quality_score, 3),
                'content': metadata.get('content', '')[:100] + '...' if len(metadata.get('content', '')) > 100 else metadata.get('content', '')
            }
            paragraphs_info.append(para_info)

        return jsonify({
            'success': True,
            'stats': stats,
            'documents': documents_info,
            'paragraphs': paragraphs_info
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/document_detail/<doc_id>')
def get_document_detail(doc_id):
    """获取文档详细内容API"""
    try:
        if doc_id not in rag_system.vector_store.documents:
            return jsonify({'success': False, 'error': '文档不存在'})

        document = rag_system.vector_store.documents[doc_id]

        # 获取该文档的所有段落信息
        doc_paragraphs = []
        for i, metadata in enumerate(rag_system.vector_store.paragraph_metadata):
            if metadata.get('doc_id') == doc_id:
                quality_score = rag_system.vector_store.quality_scores[i] if i < len(rag_system.vector_store.quality_scores) else 0.0
                para_info = {
                    'index': i,
                    'paragraph_index': metadata.get('paragraph_index', 0),
                    'content': metadata.get('content', ''),
                    'quality_score': round(quality_score, 3)
                }
                doc_paragraphs.append(para_info)

        doc_detail = {
            'id': document.id,
            'title': document.title,
            'content': document.content,
            'paragraphs': document.paragraphs,
            'paragraphs_with_scores': doc_paragraphs,
            'metadata': document.metadata,
            'created_at': document.created_at.strftime('%Y-%m-%d %H:%M:%S') if document.created_at else 'Unknown',
            'content_length': len(document.content),
            'paragraphs_count': len(document.paragraphs)
        }

        return jsonify({
            'success': True,
            'document': doc_detail
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/build', methods=['POST'])
def build_knowledge_base():
    """构建知识库API"""
    try:
        data = request.json
        data_dir = data.get('data_dir')
        include_images = data.get('include_images', True)

        if not data_dir:
            return jsonify({"success": False, "message": "请提供数据目录路径"})

        result = rag_system.build_knowledge_base(data_dir, include_images)
        return jsonify(result)

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route('/upload_images', methods=['POST'])
def upload_images():
    """上传图片并进行OCR处理API"""
    try:
        if 'images' not in request.files:
            return jsonify({"success": False, "message": "请上传图片文件"})

        files = request.files.getlist('images')
        if not files:
            return jsonify({"success": False, "message": "没有选择文件"})

        # 检查OCR是否可用
        if not rag_system.image_processor.ocr_available:
            return jsonify({
                "success": False,
                "message": "OCR功能不可用，请确认Tesseract已正确安装并配置"
            })

        results = []
        for file in files:
            if file.filename == '':
                continue

            try:
                # 检查文件类型
                filename = file.filename.lower()
                if not any(filename.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']):
                    results.append({
                        "filename": file.filename,
                        "success": False,
                        "error": "不支持的文件格式"
                    })
                    continue

                # 读取文件数据
                image_data = file.read()

                # OCR处理
                ocr_result = process_single_image(image_data, file.filename)
                results.append(ocr_result)

            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": str(e)
                })

        return jsonify({
            "success": True,
            "message": f"处理完成，共处理 {len(files)} 个文件",
            "results": results
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

@app.route('/add_images_to_kb', methods=['POST'])
def add_images_to_knowledge_base():
    """将上传的图片OCR结果添加到知识库API"""
    try:
        if 'images' not in request.files:
            return jsonify({"success": False, "message": "请上传图片文件"})

        files = request.files.getlist('images')
        if not files:
            return jsonify({"success": False, "message": "没有选择文件"})

        # 检查OCR是否可用
        if not rag_system.image_processor.ocr_available:
            return jsonify({
                "success": False,
                "message": "OCR功能不可用，请确认Tesseract已正确安装并配置"
            })

        processed_count = 0
        failed_count = 0
        ocr_results = []

        for file in files:
            if file.filename == '':
                continue

            try:
                # 检查文件类型
                filename = file.filename.lower()
                if not any(filename.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']):
                    failed_count += 1
                    continue

                # 读取文件数据
                image_data = file.read()

                # OCR处理
                ocr_result = rag_system.image_processor.extract_text_from_image(image_data, file.filename)

                # 转换为文档对象并添加到知识库
                document = rag_system.image_processor.create_document_from_ocr(ocr_result)

                if document:
                    rag_system.vector_store.add_document(document)
                    processed_count += 1
                    ocr_results.append({
                        "filename": file.filename,
                        "success": True,
                        "text_length": len(document.content),
                        "paragraph_count": len(document.paragraphs)
                    })
                else:
                    failed_count += 1
                    ocr_results.append({
                        "filename": file.filename,
                        "success": False,
                        "error": "未提取到有效文字内容"
                    })

            except Exception as e:
                failed_count += 1
                ocr_results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": str(e)
                })

        # 保存更新后的向量存储
        if processed_count > 0:
            rag_system.vector_store.save_to_file()

        return jsonify({
            "success": True,
            "message": f"图片处理完成，成功添加 {processed_count} 个文档到知识库",
            "summary": {
                "processed_count": processed_count,
                "failed_count": failed_count,
                "total_files": len(files)
            },
            "results": ocr_results
        })

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

@app.route('/ocr_single', methods=['POST'])
def ocr_single():
    """单张图片OCR识别API"""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "未找到文件"})

        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "文件名为空"})

        # 读取文件数据
        image_data = file.read()

        # 处理图片
        result = process_single_image(image_data, file.filename)

        return jsonify(result)

    except Exception as e:
        logger.error(f"单张图片OCR处理错误: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/ocr_batch', methods=['POST'])
def ocr_batch():
    """批量图片OCR识别API"""
    try:
        if 'files' not in request.files:
            return jsonify({"success": False, "error": "未找到文件"})

        files = request.files.getlist('files')
        if not files:
            return jsonify({"success": False, "error": "文件列表为空"})

        # 准备批量处理的数据
        image_files = []
        for file in files:
            if file.filename != '':
                image_data = file.read()
                image_files.append({
                    'data': image_data,
                    'filename': file.filename
                })

        if not image_files:
            return jsonify({"success": False, "error": "没有有效的图片文件"})

        # 批量处理
        result = process_batch_images(image_files)

        return jsonify({
            "success": True,
            "data": result
        })

    except Exception as e:
        logger.error(f"批量图片OCR处理错误: {e}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/ocr_status')
def ocr_status():
    """检查OCR功能状态"""
    try:
        from image_processor import image_processor
        return jsonify({
            "success": True,
            "ocr_available": image_processor.ocr_available,
            "supported_formats": list(image_processor.supported_formats)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

if __name__ == "__main__":
    print("🌊 流式RAG+LLM知识库系统启动中...")
    print("=" * 60)
    print("✨ 系统功能:")
    print("  ⚡ 实时AI响应 - 逐字显示如ChatGPT")
    print("  🔍 智能向量检索 - 高质量文档匹配")
    print("  🧠 多种LLM支持 - OpenAI/DeepSeek/智谱AI等")
    print("  💬 连续对话管理 - 上下文记忆能力")
    print("  📊 质量评估 - 实时置信度和来源分析")
    print("  🎯 状态反馈 - 完整的处理进度展示")
    print("  🌐 现代界面 - 流畅动画和视觉效果")
    print("  📸 图片文字识别 - OCR功能已启用")
    print("=" * 60)
    print("🌐 请在浏览器中访问: http://localhost:5000")
    print("⚙️  请先在代码中配置您的AI API密钥")
    print("🎉 体验流式输出：提问后看AI实时思考回答！")
    print("📸 OCR功能：支持图片文字识别和批量处理")
    print("=" * 60)

    app.run(host="0.0.0.0", port=5000, debug=True)