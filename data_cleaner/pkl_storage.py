#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据清洗模块 - PKL文件存储
"""

import pickle
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class CleanDataPKL:
    """数据清洗PKL文件存储类"""

    def __init__(self, pkl_file: str = "cleaned_data.pkl"):
        self.pkl_file = pkl_file
        self.data = self._load_data()

    def _load_data(self) -> List[Dict]:
        """加载PKL文件中的数据"""
        try:
            if os.path.exists(self.pkl_file):
                with open(self.pkl_file, 'rb') as f:
                    data = pickle.load(f)
                    logger.info(f"从{self.pkl_file}加载了{len(data)}条记录")
                    return data
            else:
                logger.info(f"PKL文件{self.pkl_file}不存在，初始化为空列表")
                return []
        except Exception as e:
            logger.error(f"加载PKL文件失败: {e}")
            return []

    def _save_data(self) -> bool:
        """保存数据到PKL文件"""
        try:
            # 创建备份
            if os.path.exists(self.pkl_file):
                backup_file = f"{self.pkl_file}.backup"
                os.rename(self.pkl_file, backup_file)

            with open(self.pkl_file, 'wb') as f:
                pickle.dump(self.data, f)

            logger.info(f"数据已保存到{self.pkl_file}，共{len(self.data)}条记录")
            return True
        except Exception as e:
            logger.error(f"保存PKL文件失败: {e}")
            # 如果保存失败，尝试恢复备份
            backup_file = f"{self.pkl_file}.backup"
            if os.path.exists(backup_file):
                os.rename(backup_file, self.pkl_file)
            return False

    def save_cleaned_data(self, original_text: str, cleaned_data: Dict) -> Optional[int]:
        """保存清洗后的数据"""
        try:
            now = datetime.now()

            # 生成新的记录ID
            record_id = len(self.data) + 1

            record = {
                'id': record_id,
                'original_text': original_text,
                'cleaned_data': cleaned_data,
                'created_at': now.isoformat(),
                'updated_at': now.isoformat()
            }

            self.data.append(record)

            if self._save_data():
                logger.info(f"数据保存成功，记录ID: {record_id}")
                return record_id
            else:
                # 如果保存失败，从列表中移除该记录
                self.data.pop()
                return None

        except Exception as e:
            logger.error(f"保存数据失败: {e}")
            return None

    def get_cleaned_data(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        """获取清洗后的数据列表"""
        try:
            # 按创建时间倒序排列
            sorted_data = sorted(self.data, key=lambda x: x.get('created_at', ''), reverse=True)

            # 分页处理
            start_idx = offset
            end_idx = min(offset + limit, len(sorted_data))

            return sorted_data[start_idx:end_idx]

        except Exception as e:
            logger.error(f"获取数据失败: {e}")
            return []

    def get_cleaned_data_by_id(self, data_id: int) -> Optional[Dict]:
        """根据ID获取清洗后的数据"""
        try:
            for record in self.data:
                if record.get('id') == data_id:
                    return record
            return None

        except Exception as e:
            logger.error(f"获取数据失败: {e}")
            return None

    def update_cleaned_data(self, data_id: int, cleaned_data: Dict) -> bool:
        """更新清洗后的数据"""
        try:
            for i, record in enumerate(self.data):
                if record.get('id') == data_id:
                    record['cleaned_data'] = cleaned_data
                    record['updated_at'] = datetime.now().isoformat()

                    if self._save_data():
                        logger.info(f"数据更新成功，ID: {data_id}")
                        return True
                    else:
                        return False

            logger.warning(f"未找到ID为{data_id}的记录")
            return False

        except Exception as e:
            logger.error(f"更新数据失败: {e}")
            return False

    def delete_cleaned_data(self, data_id: int) -> bool:
        """删除清洗后的数据"""
        try:
            for i, record in enumerate(self.data):
                if record.get('id') == data_id:
                    deleted_record = self.data.pop(i)

                    if self._save_data():
                        logger.info(f"数据删除成功，ID: {data_id}")
                        return True
                    else:
                        # 如果保存失败，恢复删除的记录
                        self.data.insert(i, deleted_record)
                        return False

            logger.warning(f"未找到ID为{data_id}的记录")
            return False

        except Exception as e:
            logger.error(f"删除数据失败: {e}")
            return False

    def get_statistics(self) -> Dict:
        """获取统计信息"""
        try:
            total_records = len(self.data)

            # 统计最近7天的记录
            recent_records = 0
            recent_threshold = (datetime.now() - timedelta(days=7)).isoformat()

            total_text_length = 0

            for record in self.data:
                created_at = record.get('created_at', '')
                if created_at > recent_threshold:
                    recent_records += 1

                original_text = record.get('original_text', '')
                total_text_length += len(original_text)

            avg_text_length = total_text_length / total_records if total_records > 0 else 0

            return {
                'total_records': total_records,
                'recent_records': recent_records,
                'avg_text_length': round(avg_text_length, 2),
                'file_size': self._get_file_size()
            }

        except Exception as e:
            logger.error(f"获取统计信息失败: {e}")
            return {'total_records': 0, 'recent_records': 0, 'avg_text_length': 0, 'file_size': 0}

    def _get_file_size(self) -> float:
        """获取PKL文件大小（MB）"""
        try:
            if os.path.exists(self.pkl_file):
                size_bytes = os.path.getsize(self.pkl_file)
                return round(size_bytes / (1024 * 1024), 2)
            return 0.0
        except Exception:
            return 0.0

    def export_to_json(self, json_file: str = None) -> str:
        """导出数据到JSON文件"""
        if json_file is None:
            json_file = f"cleaned_data_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        try:
            export_data = {
                'export_time': datetime.now().isoformat(),
                'total_records': len(self.data),
                'data': self.data
            }

            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)

            logger.info(f"数据已导出到{json_file}")
            return json_file

        except Exception as e:
            logger.error(f"导出数据失败: {e}")
            raise e

    def import_from_json(self, json_file: str) -> bool:
        """从JSON文件导入数据"""
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                import_data = json.load(f)

            if 'data' in import_data:
                # 合并数据，避免ID冲突
                max_id = max([record.get('id', 0) for record in self.data], default=0)

                for record in import_data['data']:
                    max_id += 1
                    record['id'] = max_id
                    record['imported_at'] = datetime.now().isoformat()
                    self.data.append(record)

                if self._save_data():
                    logger.info(f"从{json_file}导入了{len(import_data['data'])}条记录")
                    return True
                else:
                    return False
            else:
                logger.error("JSON文件格式错误，缺少'data'字段")
                return False

        except Exception as e:
            logger.error(f"导入数据失败: {e}")
            return False