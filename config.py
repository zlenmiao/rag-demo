#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
系统配置文件
"""
import os

def read_api_key():
    """从key.txt文件读取API密钥（第一行）"""
    try:
        with open('key.txt', 'r', encoding='utf-8') as f:
            lines = f.readlines()
            if lines:
                return lines[0].strip()
            return ""
    except Exception as e:
        print(f"读取key.txt文件时出错: {e}")
        return ""

class Config:
    """系统配置"""

    # AI API配置 - API密钥从key.txt文件读取
    AI_CONFIGS = {
        "deepseek": {
            "api_key": read_api_key(),
            "base_url": "https://api.siliconflow.cn/v1",
            "model": "deepseek-ai/DeepSeek-V3",
            "max_tokens": 2048,
            "temperature": 0.7
        }
    }

    # 当前使用的AI服务
    CURRENT_AI_SERVICE = "deepseek"  # 可选: openai, deepseek

    # 系统设置
    VECTOR_MODEL = "all-MiniLM-L6-v2"
    STORAGE_PATH = "knowledge_base.pkl"
    CONVERSATION_HISTORY_LIMIT = 10
    MAX_CONTEXT_LENGTH = 4096
    SIMILARITY_THRESHOLD = 0.1

    # 提示词模板
    SYSTEM_PROMPT = """你是一个专业的知识库助手，基于提供的知识库内容回答用户问题。

规则：
1. 优先使用知识库内容回答问题
2. 如果知识库内容不足，请明确说明
3. 回答要准确、详细、有条理
4. 适当引用来源文档
5. 保持友好、专业的语气
"""