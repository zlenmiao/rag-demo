#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据清洗模块 - 数据库操作
"""

import psycopg2
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class CleanDataDB:
    """数据清洗数据库操作类"""

    def __init__(self, db_url: str):
        self.db_url = db_url
        self.connection = None

    def connect(self):
        """连接数据库"""
        try:
            # Supabase需要SSL连接，添加SSL参数
            if 'supabase.co' in self.db_url:
                # 为Supabase添加SSL配置
                ssl_params = "?sslmode=require"
                if '?' not in self.db_url:
                    db_url_with_ssl = self.db_url + ssl_params
                else:
                    db_url_with_ssl = self.db_url + "&sslmode=require"

                # 添加连接超时和其他优化参数
                self.connection = psycopg2.connect(
                    db_url_with_ssl,
                    connect_timeout=10,
                    application_name='rag_data_cleaner'
                )
            else:
                # 本地或其他数据库
                self.connection = psycopg2.connect(
                    self.db_url,
                    connect_timeout=10,
                    application_name='rag_data_cleaner'
                )
            return True
        except Exception as e:
            logger.error(f"数据库连接失败: {e}")
            return False

    def disconnect(self):
        """断开数据库连接"""
        if self.connection:
            self.connection.close()

    def create_table(self):
        """创建数据清洗表"""
        create_sql = """
        CREATE TABLE IF NOT EXISTS cleaned_data (
            id SERIAL PRIMARY KEY,
            original_text TEXT NOT NULL,
            cleaned_data JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- 创建索引以优化查询性能
        CREATE INDEX IF NOT EXISTS idx_cleaned_data_created_at ON cleaned_data(created_at);
        CREATE INDEX IF NOT EXISTS idx_cleaned_data_jsonb ON cleaned_data USING GIN (cleaned_data);
        """

        try:
            if not self.connection:
                self.connect()

            with self.connection.cursor() as cursor:
                cursor.execute(create_sql)
                self.connection.commit()
                logger.info("数据表创建成功")
                return True
        except Exception as e:
            logger.error(f"创建数据表失败: {e}")
            if self.connection:
                self.connection.rollback()
            return False

    def _ensure_connection(self):
        """确保数据库连接有效，如果断开则重连"""
        try:
            if not self.connection:
                return self.connect()

            # 检查连接是否仍然有效
            cursor = self.connection.cursor()
            cursor.execute("SELECT 1;")
            cursor.fetchone()
            cursor.close()
            return True
        except Exception as e:
            logger.warning(f"数据库连接检查失败，尝试重连: {e}")
            try:
                if self.connection:
                    self.connection.close()
                self.connection = None
                return self.connect()
            except Exception as reconnect_error:
                logger.error(f"数据库重连失败: {reconnect_error}")
                return False

    def save_cleaned_data(self, original_text: str, cleaned_data: Dict) -> Optional[int]:
        """保存清洗后的数据"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # 确保连接有效
                if not self._ensure_connection():
                    if attempt < max_retries - 1:
                        logger.warning(f"连接失败，尝试第 {attempt + 2} 次...")
                        continue
                    else:
                        logger.error("多次连接尝试失败")
                        return None

                insert_sql = """
                INSERT INTO cleaned_data (original_text, cleaned_data, created_at, updated_at)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
                """

                now = datetime.now()

                with self.connection.cursor() as cursor:
                    cursor.execute(insert_sql, (
                        original_text,
                        json.dumps(cleaned_data, ensure_ascii=False),
                        now,
                        now
                    ))

                    record_id = cursor.fetchone()[0]
                    self.connection.commit()

                    logger.info(f"数据保存成功，ID: {record_id}")
                    return record_id

            except Exception as e:
                logger.error(f"保存数据失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                if self.connection:
                    try:
                        self.connection.rollback()
                    except:
                        pass

                # 如果是连接相关错误，标记连接为无效
                if "connection" in str(e).lower() or "server closed" in str(e).lower():
                    self.connection = None

                if attempt < max_retries - 1:
                    import time
                    time.sleep(1)  # 等待1秒后重试
                    continue
                else:
                    return None

        return None

    def get_cleaned_data(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        """获取清洗后的数据列表"""
        try:
            if not self.connection:
                self.connect()

            select_sql = """
            SELECT id, original_text, cleaned_data, created_at, updated_at
            FROM cleaned_data
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s;
            """

            with self.connection.cursor() as cursor:
                cursor.execute(select_sql, (limit, offset))
                rows = cursor.fetchall()

                results = []
                for row in rows:
                    results.append({
                        'id': row[0],
                        'original_text': row[1],
                        'cleaned_data': row[2] if isinstance(row[2], dict) else json.loads(row[2]),
                        'created_at': row[3].isoformat() if row[3] else None,
                        'updated_at': row[4].isoformat() if row[4] else None
                    })

                return results

        except Exception as e:
            logger.error(f"获取数据失败: {e}")
            return []

    def get_cleaned_data_by_id(self, data_id: int) -> Optional[Dict]:
        """根据ID获取清洗后的数据"""
        try:
            if not self.connection:
                self.connect()

            select_sql = """
            SELECT id, original_text, cleaned_data, created_at, updated_at
            FROM cleaned_data
            WHERE id = %s;
            """

            with self.connection.cursor() as cursor:
                cursor.execute(select_sql, (data_id,))
                row = cursor.fetchone()

                if row:
                    return {
                        'id': row[0],
                        'original_text': row[1],
                        'cleaned_data': row[2] if isinstance(row[2], dict) else json.loads(row[2]),
                        'created_at': row[3].isoformat() if row[3] else None,
                        'updated_at': row[4].isoformat() if row[4] else None
                    }
                return None

        except Exception as e:
            logger.error(f"获取数据失败: {e}")
            return None

    def update_cleaned_data(self, data_id: int, cleaned_data: Dict) -> bool:
        """更新清洗后的数据"""
        try:
            if not self.connection:
                self.connect()

            update_sql = """
            UPDATE cleaned_data
            SET cleaned_data = %s, updated_at = %s
            WHERE id = %s;
            """

            with self.connection.cursor() as cursor:
                cursor.execute(update_sql, (
                    json.dumps(cleaned_data, ensure_ascii=False),
                    datetime.now(),
                    data_id
                ))

                self.connection.commit()
                logger.info(f"数据更新成功，ID: {data_id}")
                return True

        except Exception as e:
            logger.error(f"更新数据失败: {e}")
            if self.connection:
                self.connection.rollback()
            return False

    def delete_cleaned_data(self, data_id: int) -> bool:
        """删除清洗后的数据"""
        try:
            if not self.connection:
                self.connect()

            delete_sql = "DELETE FROM cleaned_data WHERE id = %s;"

            with self.connection.cursor() as cursor:
                cursor.execute(delete_sql, (data_id,))
                self.connection.commit()

                logger.info(f"数据删除成功，ID: {data_id}")
                return True

        except Exception as e:
            logger.error(f"删除数据失败: {e}")
            if self.connection:
                self.connection.rollback()
            return False

    def get_statistics(self) -> Dict:
        """获取统计信息"""
        try:
            if not self.connection:
                self.connect()

            stats_sql = """
            SELECT
                COUNT(*) as total_records,
                COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as recent_records,
                AVG(LENGTH(original_text)) as avg_text_length
            FROM cleaned_data;
            """

            with self.connection.cursor() as cursor:
                cursor.execute(stats_sql)
                row = cursor.fetchone()

                return {
                    'total_records': row[0] or 0,
                    'recent_records': row[1] or 0,
                    'avg_text_length': round(row[2] or 0, 2)
                }

        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {'total_records': 0, 'recent_records': 0, 'avg_text_length': 0}