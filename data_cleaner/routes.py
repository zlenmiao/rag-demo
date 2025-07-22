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
    """保存清洗后的数据到指定存储"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "请提供有效的JSON数据"
            })

        original_text = data.get('original_text')
        cleaned_data = data.get('cleaned_data')
        storage_type = data.get('storage_type', 'database')  # 默认使用数据库

        if not original_text or not cleaned_data:
            return jsonify({
                "success": False,
                "error": "原文和清洗后的数据都不能为空"
            })

        # 验证存储类型
        if storage_type not in ['database', 'pkl']:
            return jsonify({
                "success": False,
                "error": "存储类型只能是 'database' 或 'pkl'"
            })

        # 调用保存服务
        result = data_cleaner_service.save_cleaned_data(original_text, cleaned_data, storage_type)
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
        storage_type = request.args.get('storage_type', 'database')

        # 验证存储类型
        if storage_type not in ['database', 'pkl']:
            return jsonify({
                "success": False,
                "error": "存储类型只能是 'database' 或 'pkl'"
            })

        result = data_cleaner_service.get_cleaned_data_list(limit, offset, storage_type)
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
        storage_type = request.args.get('storage_type', 'database')

        # 验证存储类型
        if storage_type not in ['database', 'pkl']:
            return jsonify({
                "success": False,
                "error": "存储类型只能是 'database' 或 'pkl'"
            })

        result = data_cleaner_service.get_cleaned_data_by_id(data_id, storage_type)
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
        storage_type = data.get('storage_type', 'database')

        if not cleaned_data:
            return jsonify({
                "success": False,
                "error": "请提供清洗后的数据"
            })

        # 验证存储类型
        if storage_type not in ['database', 'pkl']:
            return jsonify({
                "success": False,
                "error": "存储类型只能是 'database' 或 'pkl'"
            })

        result = data_cleaner_service.update_cleaned_data(data_id, cleaned_data, storage_type)
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
        storage_type = request.args.get('storage_type', 'database')

        # 验证存储类型
        if storage_type not in ['database', 'pkl']:
            return jsonify({
                "success": False,
                "error": "存储类型只能是 'database' 或 'pkl'"
            })

        result = data_cleaner_service.delete_cleaned_data(data_id, storage_type)
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
            "db_available": data_cleaner_service.db is not None,
            "pkl_available": data_cleaner_service.pkl_storage is not None
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"获取服务状态失败: {str(e)}"
        })

@data_cleaner_bp.route('/export_pkl_to_json', methods=['POST'])
def export_pkl_to_json():
    """导出PKL数据到JSON文件"""
    try:
        if not data_cleaner_service.pkl_storage:
            return jsonify({
                "success": False,
                "error": "PKL存储未初始化"
            })

        json_file = data_cleaner_service.pkl_storage.export_to_json()
        return jsonify({
            "success": True,
            "message": "数据导出成功",
            "json_file": json_file
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"导出失败: {str(e)}"
        })

@data_cleaner_bp.route('/import_json_to_pkl', methods=['POST'])
def import_json_to_pkl():
    """从JSON文件导入数据到PKL"""
    try:
        data = request.json
        if not data:
            return jsonify({
                "success": False,
                "error": "请提供有效的JSON数据"
            })

        json_file = data.get('json_file')
        if not json_file:
            return jsonify({
                "success": False,
                "error": "请提供JSON文件路径"
            })

        if not data_cleaner_service.pkl_storage:
            return jsonify({
                "success": False,
                "error": "PKL存储未初始化"
            })

        success = data_cleaner_service.pkl_storage.import_from_json(json_file)

        if success:
            return jsonify({
                "success": True,
                "message": "数据导入成功"
            })
        else:
            return jsonify({
                "success": False,
                "error": "数据导入失败"
            })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"导入失败: {str(e)}"
        })

@data_cleaner_bp.route('/viewer')
def data_viewer():
    """数据查看页面"""
    return render_template('data_viewer.html')