#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据处理模块
"""

import os
import re
import jieba
import logging
from typing import List, Optional
from data_models import Document

# 配置日志
logger = logging.getLogger(__name__)

class DataProcessor:
    """数据处理模块"""

    def __init__(self):
        jieba.initialize()
        self.stop_words = self._load_stop_words()

    def _load_stop_words(self) -> set:
        """加载停用词"""
        stop_words = {
            '的', '了', '和', '是', '在', '有', '我', '你', '他', '她', '它',
            '们', '这', '那', '个', '上', '下', '来', '去', '出', '到',
            '以', '及', '对', '为', '与', '从', '而', '或', '但', '都'
        }
        return stop_words

    def clean_text(self, text: str) -> str:
        """清洗文本数据"""
        # 去除多余的空白字符
        text = re.sub(r'\s+', ' ', text)
        # 去除特殊字符，保留中文、英文、数字和基本标点
        text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s\.\,\?\!\；\：\"\"\'\'\(\)\[\]\{\}]', '', text)
        return text.strip()

    def split_into_paragraphs(self, text: str) -> List[str]:
        """按段落分割文本"""
        # 多种分割方式
        paragraphs = []

        # 按双换行符分割
        sections = text.split('\n\n')
        for section in sections:
            # 按单换行符分割
            paras = section.split('\n')
            for para in paras:
                para = para.strip()
                if para and len(para) > 20:  # 过滤过短的段落
                    paragraphs.append(para)

        return paragraphs

    def segment_and_filter(self, text: str) -> List[str]:
        """分词并过滤停用词"""
        words = jieba.cut(text)
        filtered_words = [
            word for word in words
            if word.strip() and word not in self.stop_words and len(word) > 1
        ]
        return filtered_words

    def process_document(self, file_path: str) -> Optional[Document]:
        """处理单个文档"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # 清洗文本
            cleaned_content = self.clean_text(content)

            # 分割段落
            paragraphs = self.split_into_paragraphs(cleaned_content)

            # 创建文档对象
            doc_id = os.path.basename(file_path).split('.')[0]
            title = doc_id

            # 提取元数据
            metadata = {
                "file_path": file_path,
                "file_size": os.path.getsize(file_path),
                "paragraph_count": len(paragraphs),
                "word_count": len(self.segment_and_filter(cleaned_content))
            }

            document = Document(
                id=doc_id,
                title=title,
                content=cleaned_content,
                paragraphs=paragraphs,
                metadata=metadata
            )

            logger.info(f"处理文档: {file_path}, 段落数: {len(paragraphs)}")
            return document

        except Exception as e:
            logger.error(f"处理文档 {file_path} 时出错: {str(e)}")
            return None