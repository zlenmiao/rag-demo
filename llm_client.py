#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
大语言模型客户端
"""

import requests
import json
import logging
from typing import List, Dict
from config import Config

# 配置日志
logger = logging.getLogger(__name__)

class LLMClient:
    """大语言模型客户端"""

    def __init__(self, service: str = Config.CURRENT_AI_SERVICE):
        self.service = service
        self.config = Config.AI_CONFIGS.get(service)
        if not self.config:
            raise ValueError(f"不支持的AI服务: {service}")

        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.config['api_key']}"
        })

    def generate_response(self, messages: List[Dict], **kwargs) -> Dict:
        """生成AI响应（非流式）"""
        try:
            # 构建请求数据
            request_data = {
                "model": self.config["model"],
                "messages": messages,
                "max_tokens": kwargs.get("max_tokens", self.config["max_tokens"]),
                "temperature": kwargs.get("temperature", self.config["temperature"]),
                "stream": False
            }

            # 发送请求
            response = self.session.post(
                f"{self.config['base_url']}/chat/completions",
                json=request_data,
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "content": result["choices"][0]["message"]["content"],
                    "usage": result.get("usage", {}),
                    "model": self.config["model"]
                }
            else:
                error_details = ""
                try:
                    error_json = response.json()
                    error_details = error_json.get("error", {}).get("message", response.text)
                except:
                    error_details = response.text

                logger.error(f"API调用失败: {response.status_code}, 详情: {error_details}")
                return {
                    "success": False,
                    "error": f"API请求失败: {response.status_code}",
                    "details": error_details
                }

        except Exception as e:
            return {
                "success": False,
                "error": f"请求异常: {str(e)}"
            }

    def generate_response_stream(self, messages: List[Dict], **kwargs):
        """生成AI响应（流式）- 优化版本"""
        buffer_size = 0
        content_buffer = ""
        json_buffer = ""  # 添加JSON缓冲区

        try:
            # 构建请求数据
            request_data = {
                "model": self.config["model"],
                "messages": messages,
                "max_tokens": kwargs.get("max_tokens", self.config["max_tokens"]),
                "temperature": kwargs.get("temperature", self.config["temperature"]),
                "stream": True
            }

            # 发送流式请求
            response = self.session.post(
                f"{self.config['base_url']}/chat/completions",
                json=request_data,
                timeout=30,
                stream=True
            )

            if response.status_code == 200:
                # 强制使用UTF-8解码，不依赖requests的自动解码
                for line_bytes in response.iter_lines(decode_unicode=False):
                    if line_bytes and line_bytes.strip():
                        # 手动使用UTF-8解码
                        try:
                            line = line_bytes.decode('utf-8')
                        except UnicodeDecodeError:
                            # 如果UTF-8解码失败，尝试其他编码
                            try:
                                line = line_bytes.decode('utf-8', errors='replace')
                            except:
                                continue

                        if line.startswith('data: '):
                            data = line[6:].strip()  # 去掉 "data: " 前缀

                            if data == '[DONE]':
                                # 发送缓冲区剩余内容
                                if content_buffer.strip():
                                    yield {
                                        "success": True,
                                        "content": content_buffer,
                                        "done": False,
                                        "buffer_flush": True
                                    }
                                break

                            # 处理可能的不完整JSON数据
                            json_buffer += data

                            # 尝试解析JSON
                            processed_data = []
                            while json_buffer:
                                try:
                                    # 尝试解析JSON
                                    chunk_data = json.loads(json_buffer)
                                    processed_data.append(chunk_data)
                                    json_buffer = ""  # 清空缓冲区
                                    break
                                except json.JSONDecodeError as e:
                                    # 如果是因为数据不完整导致的错误，等待更多数据
                                    if "Unterminated string" in str(e) or "Expecting" in str(e):
                                        # 这是不完整的JSON，等待更多数据
                                        break
                                    else:
                                        # 其他JSON错误，跳过这部分数据
                                        logger.warning(f"JSON解析失败: {e}, 跳过数据")
                                        json_buffer = ""
                                        break

                            # 处理解析成功的数据
                            for chunk_data in processed_data:
                                if 'choices' in chunk_data and len(chunk_data['choices']) > 0:
                                    delta = chunk_data['choices'][0].get('delta', {})
                                    content = delta.get('content', '')

                                    # 确保内容正确编码
                                    if content and isinstance(content, str):
                                        # 内容已经是正确的UTF-8字符串，无需重新编码
                                        pass
                                    elif content and isinstance(content, bytes):
                                        # 如果内容是字节类型，解码为UTF-8
                                        try:
                                            content = content.decode('utf-8')
                                        except UnicodeDecodeError:
                                            content = content.decode('utf-8', errors='replace')

                                    if content:
                                        content_buffer += content
                                        buffer_size += len(content)

                                        # 智能缓冲：积累到一定长度或遇到标点符号时发送
                                        should_flush = (
                                            buffer_size >= 10 or  # 积累10个字符
                                            content.endswith(('。', '！', '？', '，', '；', '：', '\n', '. ', '! ', '? ')) or
                                            len(content_buffer) > 50  # 防止过长缓冲
                                        )

                                        if should_flush:
                                            yield {
                                                "success": True,
                                                "content": content_buffer,
                                                "done": False,
                                                "partial": True
                                            }
                                            content_buffer = ""
                                            buffer_size = 0

                # 发送最终完成信号
                yield {
                    "success": True,
                    "content": "",
                    "done": True,
                    "final": True
                }

            else:
                error_text = ""
                try:
                    error_data = response.json()
                    error_text = error_data.get("error", {}).get("message", response.text)
                except:
                    error_text = response.text[:200]

                yield {
                    "success": False,
                    "error": f"API请求失败 ({response.status_code}): {error_text}",
                    "done": True,
                    "status_code": response.status_code
                }

        except requests.exceptions.Timeout:
            yield {
                "success": False,
                "error": "请求超时，请检查网络连接",
                "done": True,
                "error_type": "timeout"
            }
        except requests.exceptions.ConnectionError:
            yield {
                "success": False,
                "error": "连接失败，请检查网络或API服务状态",
                "done": True,
                "error_type": "connection"
            }
        except Exception as e:
            yield {
                "success": False,
                "error": f"请求异常: {str(e)}",
                "done": True,
                "error_type": "general"
            }

    def test_connection(self) -> bool:
        """测试API连接"""
        try:
            messages = [{"role": "user", "content": "Hello"}]
            result = self.generate_response(messages, max_tokens=10)
            return result["success"]
        except:
            return False