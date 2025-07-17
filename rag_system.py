#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
高级RAG系统
"""

import os
import time
import uuid
import logging
from typing import Dict, List, Optional
from datetime import datetime
from data_processor import DataProcessor
from vector_store import IntelligentVectorStore
from llm_client import LLMClient
from conversation_manager import ConversationManager
from data_models import ConversationTurn, SearchResult
from config import Config
from image_processor import ImageProcessor

# 配置日志
logger = logging.getLogger(__name__)

class AdvancedRAGSystem:
    """高级RAG系统"""

    def __init__(self):
        self.processor = DataProcessor()
        self.vector_store = IntelligentVectorStore()
        self.llm_client = LLMClient()
        self.conversation_manager = ConversationManager()
        self.image_processor = ImageProcessor()

        # 加载存储
        self.vector_store.load_from_file()

        # 性能统计
        self.stats = {
            "total_queries": 0,
            "avg_response_time": 0,
            "avg_confidence": 0
        }

    def build_knowledge_base(self, data_dir: str, include_images: bool = True) -> Dict:
        """构建知识库"""
        if not os.path.exists(data_dir):
            return {"success": False, "message": f"数据目录不存在: {data_dir}"}

        # 重置向量存储
        self.vector_store = IntelligentVectorStore()

        # 支持的文件类型
        txt_files = [f for f in os.listdir(data_dir) if f.endswith('.txt')]
        image_files = []

        if include_images and self.image_processor.ocr_available:
            # 支持的图片格式
            image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
            image_files = [f for f in os.listdir(data_dir)
                          if any(f.lower().endswith(ext) for ext in image_extensions)]

        processed_count = 0
        failed_count = 0
        image_processed_count = 0
        image_failed_count = 0

        # 处理文本文件
        for filename in txt_files:
            file_path = os.path.join(data_dir, filename)
            document = self.processor.process_document(file_path)
            if document:
                self.vector_store.add_document(document)
                processed_count += 1
            else:
                failed_count += 1

        # 处理图片文件
        if image_files and self.image_processor.ocr_available:
            logger.info(f"开始处理 {len(image_files)} 个图片文件...")

            for filename in image_files:
                try:
                    file_path = os.path.join(data_dir, filename)

                    # 读取图片文件
                    with open(file_path, 'rb') as f:
                        image_data = f.read()

                    # OCR处理
                    ocr_result = self.image_processor.extract_text_from_image(image_data, filename)

                    # 转换为文档对象
                    document = self.image_processor.create_document_from_ocr(ocr_result, file_path)

                    if document:
                        self.vector_store.add_document(document)
                        image_processed_count += 1
                        logger.info(f"成功处理图片: {filename}")
                    else:
                        image_failed_count += 1
                        logger.warning(f"图片未提取到有效文字: {filename}")

                except Exception as e:
                    image_failed_count += 1
                    logger.error(f"处理图片失败 {filename}: {e}")

        # 保存向量存储
        self.vector_store.save_to_file()

        # 统计结果
        total_processed = processed_count + image_processed_count
        total_failed = failed_count + image_failed_count
        total_files = len(txt_files) + len(image_files)

        result = {
            "success": True,
            "message": f"知识库构建完成",
            "text_files": {
                "processed": processed_count,
                "failed": failed_count,
                "total": len(txt_files)
            },
            "image_files": {
                "processed": image_processed_count,
                "failed": image_failed_count,
                "total": len(image_files)
            },
            "summary": {
                "total_processed": total_processed,
                "total_failed": total_failed,
                "total_files": total_files,
                "ocr_available": self.image_processor.ocr_available
            }
        }

        logger.info(f"知识库构建完成 - 文本文件: {processed_count}/{len(txt_files)}, 图片文件: {image_processed_count}/{len(image_files)}")
        return result

    def _build_context(self, search_results: List[SearchResult], max_length: int = Config.MAX_CONTEXT_LENGTH) -> str:
        """构建上下文"""
        context_parts = []
        current_length = 0

        for i, result in enumerate(search_results):
            source_info = f"[文档{i+1}: {result.title}]"
            content = f"{source_info}\n{result.paragraph}\n"

            if current_length + len(content) > max_length:
                break

            context_parts.append(content)
            current_length += len(content)

        return "\n".join(context_parts)

    def _calculate_confidence(self, search_results: List[SearchResult]) -> float:
        """计算回答置信度"""
        if not search_results:
            return 0.0

        # 基于相似度和质量评分
        total_score = 0
        for result in search_results:
            # 结合相似度和质量评分
            combined_score = result.score * 0.7 + result.metadata.get("quality_score", 0) * 0.3
            total_score += combined_score

        avg_score = total_score / len(search_results)
        return min(avg_score, 1.0)

    def intelligent_query(self, query: str, session_id: Optional[str] = None, use_history: bool = True) -> Dict:
        """智能查询"""
        start_time = time.time()

        # 创建会话ID
        if not session_id:
            session_id = self.conversation_manager.create_session()

        try:
            # 1. 向量检索
            search_results = self.vector_store.intelligent_search(query, top_k=5)

            if not search_results:
                return {
                    "success": False,
                    "message": "未找到相关内容",
                    "session_id": session_id
                }

            # 2. 构建上下文
            context = self._build_context(search_results)

            # 3. 构建对话消息
            messages = [{"role": "system", "content": Config.SYSTEM_PROMPT}]

            # 添加历史对话
            if use_history and session_id:
                history_context = self.conversation_manager.get_session_context(session_id, max_turns=2)
                messages.extend(history_context)

            # 添加当前查询
            user_message = f"""知识库内容：
{context}

问题：{query}

请基于上述内容回答问题。"""
            messages.append({"role": "user", "content": user_message})

            # 4. 调用LLM
            llm_response = self.llm_client.generate_response(messages)

            if not llm_response["success"]:
                return {
                    "success": False,
                    "message": "AI服务调用失败",
                    "error": llm_response["error"],
                    "session_id": session_id
                }

            # 5. 计算置信度
            confidence = self._calculate_confidence(search_results)

            # 6. 记录对话
            response_time = time.time() - start_time
            turn = ConversationTurn(
                id=str(uuid.uuid4()),
                user_query=query,
                ai_response=llm_response["content"],
                search_results=search_results,
                timestamp=datetime.now(),
                response_time=response_time,
                confidence_score=confidence
            )

            self.conversation_manager.add_turn(session_id, turn)

            # 7. 更新统计
            self.stats["total_queries"] += 1
            self.stats["avg_response_time"] = (
                self.stats["avg_response_time"] * (self.stats["total_queries"] - 1) + response_time
            ) / self.stats["total_queries"]
            self.stats["avg_confidence"] = (
                self.stats["avg_confidence"] * (self.stats["total_queries"] - 1) + confidence
            ) / self.stats["total_queries"]

            # 8. 返回结果
            return {
                "success": True,
                "answer": llm_response["content"],
                "sources": [
                    {
                        "title": result.title,
                        "content": result.paragraph,
                        "score": result.score,
                        "quality": result.metadata.get("quality_score", 0)
                    }
                    for result in search_results
                ],
                "confidence": confidence,
                "response_time": response_time,
                "session_id": session_id,
                "model_info": {
                    "service": self.llm_client.service,
                    "model": llm_response.get("model", "unknown"),
                    "usage": llm_response.get("usage", {})
                }
            }

        except Exception as e:
            logger.error(f"查询处理失败: {str(e)}")
            return {
                "success": False,
                "message": "查询处理失败",
                "error": str(e),
                "session_id": session_id
            }

    def intelligent_query_stream(self, query: str, session_id: Optional[str] = None, use_history: bool = True):
        """智能查询（流式响应）"""
        start_time = time.time()

        # 创建会话ID
        if not session_id:
            session_id = self.conversation_manager.create_session()

        try:
            # 1. 向量检索
            search_results = self.vector_store.intelligent_search(query, top_k=5)

            if not search_results:
                yield {
                    "type": "error",
                    "data": {
                        "success": False,
                        "message": "未找到相关内容",
                        "session_id": session_id
                    }
                }
                return

            # 2. 发送检索结果
            yield {
                "type": "sources",
                "data": {
                    "sources": [
                        {
                            "title": result.title,
                            "content": result.paragraph,
                            "score": result.score,
                            "quality": result.metadata.get("quality_score", 0)
                        }
                        for result in search_results
                    ],
                    "session_id": session_id
                }
            }

            # 3. 构建上下文
            context = self._build_context(search_results)

            # 4. 构建对话消息
            messages = [{"role": "system", "content": Config.SYSTEM_PROMPT}]

            # 添加历史对话
            if use_history and session_id:
                history_context = self.conversation_manager.get_session_context(session_id, max_turns=2)
                messages.extend(history_context)

            # 添加当前查询
            user_message = f"""知识库内容：
{context}

问题：{query}

请基于上述内容回答问题。"""
            messages.append({"role": "user", "content": user_message})

            # 5. 流式调用LLM
            full_response = ""
            for chunk in self.llm_client.generate_response_stream(messages):
                if chunk["success"]:
                    if not chunk["done"]:
                        # 发送文本片段
                        full_response += chunk["content"]
                        yield {
                            "type": "text",
                            "data": {
                                "content": chunk["content"],
                                "session_id": session_id
                            }
                        }
                    else:
                        # 流式响应结束
                        break
                else:
                    # 错误处理
                    yield {
                        "type": "error",
                        "data": {
                            "success": False,
                            "message": "AI服务调用失败",
                            "error": chunk["error"],
                            "session_id": session_id
                        }
                    }
                    return

            # 6. 计算置信度和响应时间
            confidence = self._calculate_confidence(search_results)
            response_time = time.time() - start_time

            # 7. 记录对话
            turn = ConversationTurn(
                id=str(uuid.uuid4()),
                user_query=query,
                ai_response=full_response,
                search_results=search_results,
                timestamp=datetime.now(),
                response_time=response_time,
                confidence_score=confidence
            )

            self.conversation_manager.add_turn(session_id, turn)

            # 8. 更新统计
            self.stats["total_queries"] += 1
            self.stats["avg_response_time"] = (
                self.stats["avg_response_time"] * (self.stats["total_queries"] - 1) + response_time
            ) / self.stats["total_queries"]
            self.stats["avg_confidence"] = (
                self.stats["avg_confidence"] * (self.stats["total_queries"] - 1) + confidence
            ) / self.stats["total_queries"]

            # 9. 发送完成信号
            yield {
                "type": "complete",
                "data": {
                    "success": True,
                    "confidence": confidence,
                    "response_time": response_time,
                    "session_id": session_id,
                    "model_info": {
                        "service": self.llm_client.service,
                        "model": self.llm_client.config["model"]
                    }
                }
            }

        except Exception as e:
            logger.error(f"流式查询处理失败: {str(e)}")
            yield {
                "type": "error",
                "data": {
                    "success": False,
                    "message": "查询处理失败",
                    "error": str(e),
                    "session_id": session_id
                }
            }

    def get_system_stats(self) -> Dict:
        """获取系统统计信息"""
        return {
            "knowledge_base": {
                "documents": len(self.vector_store.documents),
                "paragraphs": len(self.vector_store.paragraph_embeddings)
            },
            "performance": self.stats,
            "ai_service": {
                "current": self.llm_client.service,
                "available": list(Config.AI_CONFIGS.keys()),
                "connection_status": self.llm_client.test_connection()
            }
        }