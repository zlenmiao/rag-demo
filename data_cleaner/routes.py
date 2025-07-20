#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据清洗模块 - Flask路由
"""

from flask import Blueprint, request, jsonify, render_template
from .cleaner_service import data_cleaner_service

# 创建蓝图
data_cleaner_bp = Blueprint('data_cleaner', __name__, url_prefix='/data_cleaner')

@data_cleaner_bp.route('/')
def index():
    """数据清洗主页面"""
    return render_template('data_cleaner.html')

@data_cleaner_bp.route('/get_default_prompt', methods=['GET'])
def get_default_prompt():
    """获取默认的System Prompt"""
    try:
        prompt = data_cleaner_service.get_default_prompt()
        return jsonify({
            "success": True,
            "prompt": prompt
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

@data_cleaner_bp.route('/clean_data', methods=['POST'])
def clean_data():
    """数据清洗API"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "请提供有效的JSON数据"
            })

        text = data.get('text')
        system_prompt = data.get('system_prompt')

        if not text:
            return jsonify({
                "success": False,
                "error": "请提供要清洗的文本内容"
            })

        # 调用清洗服务
        result = data_cleaner_service.clean_data(text, system_prompt)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"请求处理失败: {str(e)}"
        })

@data_cleaner_bp.route('/save_data', methods=['POST'])
def save_data():
    """保存清洗后的数据到数据库"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "请提供有效的JSON数据"
            })

        original_text = data.get('original_text')
        cleaned_data = data.get('cleaned_data')

        if not original_text or not cleaned_data:
            return jsonify({
                "success": False,
                "error": "原文和清洗后的数据都不能为空"
            })

        # 调用保存服务
        result = data_cleaner_service.save_cleaned_data(original_text, cleaned_data)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"保存失败: {str(e)}"
        })

@data_cleaner_bp.route('/data_list', methods=['GET'])
def get_data_list():
    """获取清洗后的数据列表"""
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        result = data_cleaner_service.get_cleaned_data_list(limit, offset)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"获取数据列表失败: {str(e)}"
        })

@data_cleaner_bp.route('/data/<int:data_id>', methods=['GET'])
def get_data_detail(data_id):
    """获取指定ID的数据详情"""
    try:
        result = data_cleaner_service.get_cleaned_data_by_id(data_id)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"获取数据详情失败: {str(e)}"
        })

@data_cleaner_bp.route('/data/<int:data_id>', methods=['PUT'])
def update_data(data_id):
    """更新指定ID的数据"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "请提供有效的JSON数据"
            })

        cleaned_data = data.get('cleaned_data')
        if not cleaned_data:
            return jsonify({
                "success": False,
                "error": "请提供清洗后的数据"
            })

        result = data_cleaner_service.update_cleaned_data(data_id, cleaned_data)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"更新数据失败: {str(e)}"
        })

@data_cleaner_bp.route('/data/<int:data_id>', methods=['DELETE'])
def delete_data(data_id):
    """删除指定ID的数据"""
    try:
        result = data_cleaner_service.delete_cleaned_data(data_id)
        return jsonify(result)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"删除数据失败: {str(e)}"
        })

@data_cleaner_bp.route('/status', methods=['GET'])
def get_service_status():
    """获取数据清洗服务状态"""
    try:
        return jsonify({
            "success": True,
            "service_status": "运行中",
            "config_loaded": data_cleaner_service.config_loaded,
            "llm_available": data_cleaner_service.llm_client is not None,
            "db_available": data_cleaner_service.db is not None
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"获取服务状态失败: {str(e)}"
        })