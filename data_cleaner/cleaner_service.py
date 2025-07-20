#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据清洗服务 - 主要业务逻辑
"""

import json
import logging
import os
import sys
from typing import Dict, Optional

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from llm_client import LLMClient
from data_cleaner.database import CleanDataDB
from data_cleaner.prompt_config import DEFAULT_PROMPT

logger = logging.getLogger(__name__)

class DataCleanerService:
    """数据清洗服务类"""

    def __init__(self):
        self.llm_client = None
        self.db = None
        self.config_loaded = False
        self._load_config()

    def _load_config(self):
        """加载配置信息"""
        try:
            # 使用根目录的key.txt文件
            config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'key.txt')
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    lines = f.read().strip().split('\n')
                    if len(lines) >= 2:
                        db_url = lines[1].strip()

                        # 初始化LLM客户端（使用项目现有的LLMClient）
                        self.llm_client = LLMClient()

                        # 初始化数据库
                        self.db = CleanDataDB(db_url)
                        self.db.create_table()

                        self.config_loaded = True
                        logger.info("数据清洗服务配置加载成功")
                    else:
                        logger.error("配置文件格式错误")
            else:
                logger.error("配置文件不存在: key.txt")
        except Exception as e:
            logger.error(f"加载配置失败: {e}")

    def get_default_prompt(self) -> str:
        """获取默认提示词"""
        return DEFAULT_PROMPT

    def clean_data(self, text: str, system_prompt: str = None) -> Dict:
        """
        使用AI清洗数据

        Args:
            text: 原始文本
            system_prompt: 系统提示词，如果为None则使用默认

        Returns:
            清洗结果字典
        """
        if not self.config_loaded:
            return {
                "success": False,
                "error": "服务配置未正确加载，请检查key.txt文件"
            }

        if not text.strip():
            return {
                "success": False,
                "error": "输入文本不能为空"
            }

        try:
            # 使用提供的system_prompt或默认值
            prompt = system_prompt or DEFAULT_PROMPT

            # 构建消息
            messages = [
                {
                    "role": "system",
                    "content": prompt
                },
                {
                    "role": "user",
                    "content": f"请对以下文本进行清洗和结构化处理：\n\n{text}"
                }
            ]

            # 调用LLM
            result = self.llm_client.generate_response(
                messages=messages,
                max_tokens=4000,
                temperature=0.1  # 较低的温度确保输出稳定
            )

            if result["success"]:
                # 解析AI返回的JSON
                content = result["content"].replace("```json", "").replace("```", "")

                try:
                    cleaned_data = json.loads(content)

                    # 验证返回数据格式
                    if not self._validate_cleaned_data(cleaned_data):
                        return {
                            "success": False,
                            "error": "AI返回的数据格式不符合要求"
                        }

                    return {
                        "success": True,
                        "cleaned_data": cleaned_data,
                        "usage": result.get("usage", {}),
                        "model": result.get("model", "unknown")
                    }
                except json.JSONDecodeError as e:
                    logger.error(f"解析AI返回的JSON失败: {e}")
                    logger.error(f"AI返回内容: {content}")
                    return {
                        "success": False,
                        "error": "AI返回的不是有效的JSON格式"
                    }
            else:
                return {
                    "success": False,
                    "error": f"AI调用失败: {result['error']}"
                }

        except Exception as e:
            logger.error(f"数据清洗过程发生错误: {e}")
            return {
                "success": False,
                "error": f"处理过程发生错误: {str(e)}"
            }

    def _validate_cleaned_data(self, data: Dict) -> bool:
        """
        验证清洗后的数据格式

        Args:
            data: 待验证的数据

        Returns:
            是否符合格式要求
        """
        if not isinstance(data, dict):
            return False

        if "chunks" not in data:
            return False

        if not isinstance(data["chunks"], list):
            return False

        # 验证每个chunk的格式
        for chunk in data["chunks"]:
            if not isinstance(chunk, dict):
                return False

            required_fields = ["summary", "keywords", "category", "search_vector"]
            for field in required_fields:
                if field not in chunk:
                    return False

            # 验证keywords是列表
            if not isinstance(chunk["keywords"], list):
                return False

        return True

    def save_cleaned_data(self, original_text: str, cleaned_data: Dict) -> Dict:
        """
        保存清洗后的数据到数据库

        Args:
            original_text: 原始文本
            cleaned_data: 清洗后的数据

        Returns:
            保存结果
        """
        if not self.config_loaded:
            return {
                "success": False,
                "error": "服务配置未正确加载"
            }

        try:
            record_id = self.db.save_cleaned_data(original_text, cleaned_data)
            if record_id:
                return {
                    "success": True,
                    "record_id": record_id,
                    "message": "数据保存成功"
                }
            else:
                return {
                    "success": False,
                    "error": "数据保存失败"
                }
        except Exception as e:
            logger.error(f"保存数据时发生错误: {e}")
            return {
                "success": False,
                "error": f"保存失败: {str(e)}"
            }

    def get_cleaned_data_list(self, limit: int = 50, offset: int = 0) -> Dict:
        """
        获取清洗后的数据列表

        Args:
            limit: 限制数量
            offset: 偏移量

        Returns:
            数据列表
        """
        if not self.config_loaded:
            return {
                "success": False,
                "error": "服务配置未正确加载"
            }

        try:
            data_list = self.db.get_cleaned_data(limit, offset)
            stats = self.db.get_statistics()

            return {
                "success": True,
                "data": data_list,
                "statistics": stats
            }
        except Exception as e:
            logger.error(f"获取数据列表时发生错误: {e}")
            return {
                "success": False,
                "error": f"获取数据失败: {str(e)}"
            }

    def get_cleaned_data_by_id(self, data_id: int) -> Dict:
        """
        根据ID获取清洗后的数据

        Args:
            data_id: 数据ID

        Returns:
            数据详情
        """
        if not self.config_loaded:
            return {
                "success": False,
                "error": "服务配置未正确加载"
            }

        try:
            data = self.db.get_cleaned_data_by_id(data_id)
            if data:
                return {
                    "success": True,
                    "data": data
                }
            else:
                return {
                    "success": False,
                    "error": "数据不存在"
                }
        except Exception as e:
            logger.error(f"获取数据详情时发生错误: {e}")
            return {
                "success": False,
                "error": f"获取数据失败: {str(e)}"
            }

    def update_cleaned_data(self, data_id: int, cleaned_data: Dict) -> Dict:
        """
        更新清洗后的数据

        Args:
            data_id: 数据ID
            cleaned_data: 更新的数据

        Returns:
            更新结果
        """
        if not self.config_loaded:
            return {
                "success": False,
                "error": "服务配置未正确加载"
            }

        try:
            # 验证数据格式
            if not self._validate_cleaned_data(cleaned_data):
                return {
                    "success": False,
                    "error": "数据格式不符合要求"
                }

            success = self.db.update_cleaned_data(data_id, cleaned_data)
            if success:
                return {
                    "success": True,
                    "message": "数据更新成功"
                }
            else:
                return {
                    "success": False,
                    "error": "数据更新失败"
                }
        except Exception as e:
            logger.error(f"更新数据时发生错误: {e}")
            return {
                "success": False,
                "error": f"更新失败: {str(e)}"
            }

    def delete_cleaned_data(self, data_id: int) -> Dict:
        """
        删除清洗后的数据

        Args:
            data_id: 数据ID

        Returns:
            删除结果
        """
        if not self.config_loaded:
            return {
                "success": False,
                "error": "服务配置未正确加载"
            }

        try:
            success = self.db.delete_cleaned_data(data_id)
            if success:
                return {
                    "success": True,
                    "message": "数据删除成功"
                }
            else:
                return {
                    "success": False,
                    "error": "数据删除失败"
                }
        except Exception as e:
            logger.error(f"删除数据时发生错误: {e}")
            return {
                "success": False,
                "error": f"删除失败: {str(e)}"
            }

# 全局服务实例
data_cleaner_service = DataCleanerService()