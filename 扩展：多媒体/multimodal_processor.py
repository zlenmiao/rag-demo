#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
多模态处理器 - 最小代价扩展实现示例
基于现有架构的渐进式扩展
"""

import os
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
import logging
from dataclasses import dataclass, field
from datetime import datetime

# 现有模块
from data_models import Document
from image_processor import ImageProcessor

logger = logging.getLogger(__name__)

@dataclass
class TableContent:
    """表格内容数据结构"""
    headers: List[str]
    rows: List[List[str]]
    summary: str
    source_file: str
    metadata: Dict = field(default_factory=dict)

@dataclass
class ChartContent:
    """图表内容数据结构"""
    chart_type: str  # 'bar', 'line', 'pie', 'scatter'
    data_points: List[Dict]
    description: str
    trends: str
    source_file: str
    metadata: Dict = field(default_factory=dict)

@dataclass
class EnhancedDocument(Document):
    """扩展的文档模型 - 向前兼容"""
    content_type: str = 'text'  # 'text', 'image', 'table', 'chart', 'mixed'

    # 新增多媒体字段
    tables: List[TableContent] = field(default_factory=list)
    charts: List[ChartContent] = field(default_factory=list)
    images_metadata: List[Dict] = field(default_factory=list)

    def to_legacy_document(self) -> Document:
        """转换为原始Document格式以保持兼容性"""
        return Document(
            id=self.id,
            title=self.title,
            content=self.content,
            paragraphs=self.paragraphs,
            metadata=self.metadata,
            created_at=self.created_at
        )

class TableProcessor:
    """表格处理器"""

    def __init__(self):
        self.supported_formats = {'.csv', '.xlsx', '.xls'}

    def process_file(self, file_path: str) -> List[TableContent]:
        """处理表格文件"""
        try:
            ext = os.path.splitext(file_path)[1].lower()

            if ext == '.csv':
                df = pd.read_csv(file_path)
            elif ext in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            else:
                raise ValueError(f"不支持的文件格式: {ext}")

            return self._convert_dataframe_to_table_content(df, file_path)

        except Exception as e:
            logger.error(f"处理表格文件失败 {file_path}: {e}")
            return []

    def _convert_dataframe_to_table_content(self, df: pd.DataFrame, source_file: str) -> List[TableContent]:
        """将DataFrame转换为TableContent"""
        tables = []

        # 基础表格信息
        headers = df.columns.tolist()
        rows = df.values.tolist()

        # 生成表格摘要
        summary = self._generate_table_summary(df)

        table_content = TableContent(
            headers=headers,
            rows=rows,
            summary=summary,
            source_file=source_file,
            metadata={
                'shape': df.shape,
                'dtypes': df.dtypes.to_dict(),
                'has_null': df.isnull().any().any(),
                'memory_usage': df.memory_usage().sum()
            }
        )

        tables.append(table_content)
        return tables

    def _generate_table_summary(self, df: pd.DataFrame) -> str:
        """生成表格摘要描述"""
        rows, cols = df.shape
        summary_parts = [f"这是一个包含{rows}行{cols}列的数据表格"]

        # 列名信息
        if len(df.columns) <= 10:
            summary_parts.append(f"列名包括: {', '.join(df.columns)}")
        else:
            summary_parts.append(f"主要列名包括: {', '.join(df.columns[:5])}等")

        # 数值列统计
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            summary_parts.append(f"包含{len(numeric_cols)}个数值列")

            # 简单统计
            for col in numeric_cols[:3]:  # 只统计前3个数值列
                values = df[col].dropna()
                if len(values) > 0:
                    summary_parts.append(
                        f"{col}列: 最小值{values.min():.2f}, 最大值{values.max():.2f}, 平均值{values.mean():.2f}"
                    )

        return "。".join(summary_parts) + "。"

    def extract_table_text(self, table: TableContent) -> str:
        """提取表格的文本表示用于向量化"""
        text_parts = []

        # 添加摘要
        text_parts.append(table.summary)

        # 添加表头
        text_parts.append("表格列名: " + ", ".join(table.headers))

        # 添加部分数据行 (避免文本过长)
        if table.rows:
            text_parts.append("表格数据示例:")
            for i, row in enumerate(table.rows[:5]):  # 只取前5行
                row_text = ", ".join([str(cell) for cell in row])
                text_parts.append(f"第{i+1}行: {row_text}")

        return "\n".join(text_parts)

class SimpleChartProcessor:
    """简单图表处理器 - 基于规则的实现"""

    def __init__(self):
        self.chart_keywords = {
            'bar': ['柱状图', '条形图', 'bar chart', '柱形图'],
            'line': ['折线图', '线图', 'line chart', '趋势图'],
            'pie': ['饼图', 'pie chart', '圆饼图'],
            'scatter': ['散点图', 'scatter plot', '散布图']
        }

    def analyze_image_chart(self, image_path: str, ocr_text: str = None) -> Optional[ChartContent]:
        """分析图片中的图表内容"""
        try:
            # 使用OCR文本判断图表类型
            if not ocr_text:
                return None

            chart_type = self._detect_chart_type(ocr_text)
            if not chart_type:
                return None

            # 提取数据点（简化实现）
            data_points = self._extract_simple_data_points(ocr_text)

            # 生成描述
            description = self._generate_chart_description(chart_type, data_points, ocr_text)

            # 分析趋势
            trends = self._analyze_simple_trends(chart_type, data_points)

            return ChartContent(
                chart_type=chart_type,
                data_points=data_points,
                description=description,
                trends=trends,
                source_file=image_path,
                metadata={'ocr_text': ocr_text}
            )

        except Exception as e:
            logger.error(f"分析图表失败 {image_path}: {e}")
            return None

    def _detect_chart_type(self, text: str) -> Optional[str]:
        """检测图表类型"""
        text_lower = text.lower()

        for chart_type, keywords in self.chart_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return chart_type

        # 基于内容特征推断
        if any(word in text_lower for word in ['%', '百分比', 'percent']):
            return 'pie'
        elif any(word in text_lower for word in ['趋势', '时间', '年', '月']):
            return 'line'
        else:
            return 'bar'  # 默认为柱状图

    def _extract_simple_data_points(self, text: str) -> List[Dict]:
        """简单的数据点提取（基于正则表达式）"""
        import re

        data_points = []

        # 查找数字模式
        number_pattern = r'\d+\.?\d*'
        numbers = re.findall(number_pattern, text)

        # 查找可能的标签（中文、英文单词）
        label_pattern = r'[\u4e00-\u9fa5]+|[a-zA-Z]+[a-zA-Z\s]*'
        labels = re.findall(label_pattern, text)

        # 简单配对
        for i, num in enumerate(numbers[:10]):  # 最多处理10个数据点
            label = labels[i] if i < len(labels) else f"数据{i+1}"
            data_points.append({
                'label': label,
                'value': float(num),
                'index': i
            })

        return data_points

    def _generate_chart_description(self, chart_type: str, data_points: List[Dict], ocr_text: str) -> str:
        """生成图表描述"""
        type_names = {
            'bar': '柱状图',
            'line': '折线图',
            'pie': '饼图',
            'scatter': '散点图'
        }

        description_parts = [f"这是一个{type_names.get(chart_type, '图表')}"]

        if data_points:
            description_parts.append(f"包含{len(data_points)}个数据点")

            # 添加数值范围
            values = [dp['value'] for dp in data_points]
            if values:
                description_parts.append(f"数值范围从{min(values)}到{max(values)}")

                # 最大最小值对应的标签
                max_idx = values.index(max(values))
                min_idx = values.index(min(values))
                description_parts.append(f"最大值为{data_points[max_idx]['label']}({max(values)})")
                description_parts.append(f"最小值为{data_points[min_idx]['label']}({min(values)})")

        # 添加OCR原始信息的精简版
        if len(ocr_text) < 200:
            description_parts.append(f"图表内容: {ocr_text}")

        return "，".join(description_parts) + "。"

    def _analyze_simple_trends(self, chart_type: str, data_points: List[Dict]) -> str:
        """简单趋势分析"""
        if not data_points:
            return "无法分析趋势"

        values = [dp['value'] for dp in data_points]

        if chart_type == 'line':
            # 折线图趋势分析
            if len(values) >= 2:
                if values[-1] > values[0]:
                    return "整体呈上升趋势"
                elif values[-1] < values[0]:
                    return "整体呈下降趋势"
                else:
                    return "整体相对稳定"

        elif chart_type == 'bar':
            # 柱状图值分布分析
            avg_value = sum(values) / len(values)
            above_avg = len([v for v in values if v > avg_value])
            return f"平均值{avg_value:.2f}，{above_avg}个数据点高于平均值"

        elif chart_type == 'pie':
            # 饼图比例分析
            total = sum(values)
            max_value = max(values)
            max_percentage = (max_value / total) * 100 if total > 0 else 0
            return f"最大占比为{max_percentage:.1f}%"

        return "趋势分析完成"

class MultiModalProcessor:
    """多模态处理器 - 集成类"""

    def __init__(self):
        self.image_processor = ImageProcessor()
        self.table_processor = TableProcessor()
        self.chart_processor = SimpleChartProcessor()

    def process_file(self, file_path: str) -> EnhancedDocument:
        """处理单个文件，返回增强的文档对象"""

        file_ext = os.path.splitext(file_path)[1].lower()
        filename = os.path.basename(file_path)

        # 创建基础文档
        doc = EnhancedDocument(
            id=f"doc_{hash(file_path)}",
            title=filename,
            content="",
            paragraphs=[],
            created_at=datetime.now()
        )

        try:
            # 处理表格文件
            if file_ext in self.table_processor.supported_formats:
                doc.content_type = 'table'
                tables = self.table_processor.process_file(file_path)
                doc.tables = tables

                # 生成文本内容用于向量化
                text_content = []
                for table in tables:
                    text_content.append(self.table_processor.extract_table_text(table))

                doc.content = "\n\n".join(text_content)
                doc.paragraphs = text_content

            # 处理图片文件
            elif file_ext in self.image_processor.supported_formats:
                doc.content_type = 'image'

                # OCR文字提取
                ocr_result = self.image_processor.extract_text_from_image(file_path)
                if ocr_result and ocr_result.get('text'):
                    doc.content = ocr_result['text']
                    doc.paragraphs = [ocr_result['text']]

                # 尝试图表分析
                chart = self.chart_processor.analyze_image_chart(file_path, ocr_result.get('text'))
                if chart:
                    doc.content_type = 'chart'
                    doc.charts = [chart]

                    # 合并图表描述到内容
                    chart_text = f"{chart.description}\n{chart.trends}"
                    doc.content = f"{doc.content}\n\n{chart_text}".strip()
                    doc.paragraphs.append(chart_text)

                # 记录图片元数据
                doc.images_metadata = [{
                    'file_path': file_path,
                    'ocr_confidence': ocr_result.get('confidence', 0) if ocr_result else 0,
                    'has_chart': len(doc.charts) > 0
                }]

            # 处理文本文件 (保持原有逻辑)
            else:
                doc.content_type = 'text'
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                doc.content = content
                doc.paragraphs = content.split('\n\n')  # 简单分段

            logger.info(f"成功处理文件: {file_path}, 类型: {doc.content_type}")
            return doc

        except Exception as e:
            logger.error(f"处理文件失败 {file_path}: {e}")
            # 返回基础文档
            return doc

    def batch_process_directory(self, directory: str) -> List[EnhancedDocument]:
        """批量处理目录中的文件"""
        documents = []

        for root, dirs, files in os.walk(directory):
            for file in files:
                file_path = os.path.join(root, file)

                # 跳过隐藏文件和系统文件
                if file.startswith('.'):
                    continue

                doc = self.process_file(file_path)
                if doc.content.strip():  # 只添加有内容的文档
                    documents.append(doc)

        logger.info(f"批量处理完成，共处理{len(documents)}个文档")
        return documents

# 使用示例
if __name__ == "__main__":
    # 配置日志
    logging.basicConfig(level=logging.INFO)

    # 创建处理器
    processor = MultiModalProcessor()

    # 处理单个文件示例
    # doc = processor.process_file("test_data/sample.xlsx")
    # print(f"文档类型: {doc.content_type}")
    # print(f"内容长度: {len(doc.content)}")

    # 批量处理示例
    # documents = processor.batch_process_directory("test_data")
    # print(f"处理了{len(documents)}个文档")