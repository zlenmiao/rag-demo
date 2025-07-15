#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
智能向量存储模块
"""

import os
import pickle
import numpy as np
import logging
from typing import List, Dict
from sentence_transformers import SentenceTransformer
from data_models import Document, SearchResult
from data_processor import DataProcessor
from config import Config

# 配置日志
logger = logging.getLogger(__name__)

class IntelligentVectorStore:
    """智能向量存储模块"""

    def __init__(self, model_name: str = Config.VECTOR_MODEL):
        self.model = SentenceTransformer(model_name)
        self.processor = DataProcessor()
        self.documents: Dict[str, Document] = {}
        self.paragraph_embeddings: List[np.ndarray] = []
        self.paragraph_metadata: List[Dict] = []
        self.storage_path = Config.STORAGE_PATH

        # 文档质量评分
        self.quality_scores: List[float] = []

    def add_document(self, document: Document):
        """添加文档到向量存储"""
        if document is None:
            return

        # 存储文档
        self.documents[document.id] = document

        # 为每个段落生成向量和质量评分
        for idx, paragraph in enumerate(document.paragraphs):
            if paragraph.strip():
                # 生成段落向量
                embedding = self.model.encode(paragraph)
                self.paragraph_embeddings.append(embedding)

                # 计算段落质量评分
                quality_score = self._calculate_paragraph_quality(paragraph)
                self.quality_scores.append(quality_score)

                # 存储段落元数据
                metadata = {
                    "doc_id": document.id,
                    "title": document.title,
                    "paragraph_index": idx,
                    "paragraph": paragraph,
                    "quality_score": quality_score,
                    "word_count": len(self.processor.segment_and_filter(paragraph))
                }
                self.paragraph_metadata.append(metadata)

        logger.info(f"添加文档: {document.id}, 段落数: {len(document.paragraphs)}")

    def _calculate_paragraph_quality(self, paragraph: str) -> float:
        """计算段落质量评分"""
        score = 0.0

        # 长度评分
        length = len(paragraph)
        if 50 <= length <= 500:
            score += 0.3
        elif 500 < length <= 1000:
            score += 0.2

        # 信息密度评分
        words = self.processor.segment_and_filter(paragraph)
        unique_words = len(set(words))
        if unique_words > 10:
            score += 0.3

        # 结构评分
        if '：' in paragraph or '。' in paragraph:
            score += 0.2

        # 专业性评分
        if any(char.isdigit() for char in paragraph):
            score += 0.1

        # 关键词密度
        if len(words) > 0:
            keyword_density = unique_words / len(words)
            if 0.3 <= keyword_density <= 0.7:
                score += 0.1

        return min(score, 1.0)

    def intelligent_search(self, query: str, top_k: int = 5, diversity_factor: float = 0.3) -> List[SearchResult]:
        """智能搜索，结合相似度、质量和多样性"""
        if not self.paragraph_embeddings:
            return []

        # 对查询进行向量化
        query_embedding = self.model.encode(query)

        # 计算相似度
        similarities = []
        for i, para_embedding in enumerate(self.paragraph_embeddings):
            similarity = np.dot(query_embedding, para_embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(para_embedding)
            )
            similarities.append(similarity)

        # 智能重排序
        scored_results = []
        for i, similarity in enumerate(similarities):
            if similarity > Config.SIMILARITY_THRESHOLD:
                # 综合评分 = 相似度 × 权重 + 质量评分 × 权重
                combined_score = similarity * 0.7 + self.quality_scores[i] * 0.3
                scored_results.append((i, similarity, combined_score))

        # 排序并选择多样化结果
        scored_results.sort(key=lambda x: x[2], reverse=True)

        # 多样化选择
        selected_results = []
        selected_docs = []  # 改为列表以支持count方法

        for idx, similarity, combined_score in scored_results:
            if len(selected_results) >= top_k:
                break

            metadata = self.paragraph_metadata[idx]
            doc_id = metadata["doc_id"]

            # 控制同一文档的结果数量
            if selected_docs.count(doc_id) < 2:  # 每个文档最多2个结果
                selected_docs.append(doc_id)
                result = SearchResult(
                    doc_id=doc_id,
                    title=metadata["title"],
                    paragraph=metadata["paragraph"],
                    score=float(similarity),
                    paragraph_index=metadata["paragraph_index"],
                    metadata={
                        "quality_score": metadata["quality_score"],
                        "word_count": metadata["word_count"],
                        "combined_score": combined_score
                    }
                )
                selected_results.append(result)

        return selected_results

    def save_to_file(self):
        """保存向量存储到文件"""
        data = {
            "documents": self.documents,
            "paragraph_embeddings": self.paragraph_embeddings,
            "paragraph_metadata": self.paragraph_metadata,
            "quality_scores": self.quality_scores
        }
        with open(self.storage_path, 'wb') as f:
            pickle.dump(data, f)
        logger.info(f"向量存储已保存到: {self.storage_path}")

    def load_from_file(self):
        """从文件加载向量存储"""
        if os.path.exists(self.storage_path):
            try:
                with open(self.storage_path, 'rb') as f:
                    data = pickle.load(f)

                self.documents = data["documents"]
                self.paragraph_embeddings = data["paragraph_embeddings"]
                self.paragraph_metadata = data["paragraph_metadata"]
                self.quality_scores = data.get("quality_scores", [])

                logger.info(f"从文件加载向量存储: {self.storage_path}")
            except Exception as e:
                logger.error(f"加载向量存储失败: {str(e)}")
        else:
            logger.info("未找到存储文件，将创建新的向量存储")