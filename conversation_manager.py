#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
对话管理器
"""

import uuid
from typing import Dict, List
from datetime import datetime
from data_models import ConversationSession, ConversationTurn
from config import Config

class ConversationManager:
    """对话管理器"""

    def __init__(self):
        self.sessions: Dict[str, ConversationSession] = {}
        self.max_history = Config.CONVERSATION_HISTORY_LIMIT

    def create_session(self) -> str:
        """创建新会话"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = ConversationSession(session_id=session_id)
        return session_id

    def add_turn(self, session_id: str, turn: ConversationTurn):
        """添加对话轮次"""
        if session_id not in self.sessions:
            self.sessions[session_id] = ConversationSession(session_id=session_id)

        session = self.sessions[session_id]
        session.turns.append(turn)
        session.updated_at = datetime.now()

        # 限制历史记录数量
        if len(session.turns) > self.max_history:
            session.turns = session.turns[-self.max_history:]

    def get_session_context(self, session_id: str, max_turns: int = 3) -> List[Dict]:
        """获取会话上下文"""
        if session_id not in self.sessions:
            return []

        session = self.sessions[session_id]
        recent_turns = session.turns[-max_turns:]

        context = []
        for turn in recent_turns:
            context.extend([
                {"role": "user", "content": turn.user_query},
                {"role": "assistant", "content": turn.ai_response}
            ])

        return context