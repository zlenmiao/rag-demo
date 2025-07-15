#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据模型定义
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any
from datetime import datetime

@dataclass
class Document:
    """文档数据结构"""
    id: str
    title: str
    content: str
    paragraphs: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class SearchResult:
    """搜索结果数据结构"""
    doc_id: str
    title: str
    paragraph: str
    score: float
    paragraph_index: int
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ConversationTurn:
    """对话轮次数据结构"""
    id: str
    user_query: str
    ai_response: str
    search_results: List[SearchResult]
    timestamp: datetime
    response_time: float
    confidence_score: float

@dataclass
class ConversationSession:
    """对话会话数据结构"""
    session_id: str
    turns: List[ConversationTurn] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)