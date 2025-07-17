#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
图片文字识别处理模块
基于免费的Tesseract OCR实现
"""

import os
import io
import logging
from PIL import Image
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime
from data_models import Document

# 配置日志
logger = logging.getLogger(__name__)

# 延迟导入以避免依赖问题
try:
    import pytesseract
    import cv2
    OCR_AVAILABLE = True
except ImportError as e:
    logger.warning(f"OCR依赖未安装: {e}")
    OCR_AVAILABLE = False

class ImageProcessor:
    """图片文字识别处理器"""

    def __init__(self, tesseract_path: Optional[str] = None):
        """初始化图片处理器

        Args:
            tesseract_path: Tesseract可执行文件的路径，如果不提供则尝试自动检测
        """
        self.supported_formats = {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'}
        self.ocr_available = OCR_AVAILABLE
        if self.ocr_available:
            self._setup_tesseract(tesseract_path)
            self._check_tesseract()

    def _setup_tesseract(self, tesseract_path: Optional[str] = None):
        """设置Tesseract路径"""
        if not OCR_AVAILABLE:
            return

        # 如果用户指定了路径，直接使用
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
            logger.info(f"使用指定的Tesseract路径: {tesseract_path}")
            return

        # 尝试常见的Windows安装路径
        possible_paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
            r'C:\Users\{}\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'.format(os.environ.get('USERNAME', '')),
            # 添加其他可能的路径
        ]

        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                logger.info(f"自动找到Tesseract路径: {path}")
                return

        logger.warning("未能自动找到Tesseract路径，请手动指定")

    def _check_tesseract(self):
        """检查Tesseract是否可用"""
        if not OCR_AVAILABLE:
            return False
        try:
            pytesseract.get_tesseract_version()
            logger.info("Tesseract OCR 可用")
            return True
        except Exception as e:
            logger.error(f"Tesseract OCR 不可用: {e}")
            self.ocr_available = False
            return False

    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """图片预处理以提高OCR准确率"""
        if not self.ocr_available:
            return image

        try:
            # 转换为numpy数组
            img_array = np.array(image)

            # 如果是彩色图片，转换为灰度
            if len(img_array.shape) == 3:
                img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)

            # 去噪
            img_array = cv2.medianBlur(img_array, 3)

            # 二值化
            _, img_array = cv2.threshold(img_array, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            # 转换回PIL Image
            return Image.fromarray(img_array)
        except Exception as e:
            logger.warning(f"图片预处理失败，使用原图: {e}")
            return image

    def extract_text_from_image(self, image_data: bytes, filename: str = "") -> Dict[str, Any]:
        """从图片中提取文字"""
        # 检查OCR是否可用
        if not self.ocr_available:
            return {
                "success": False,
                "error": "OCR功能不可用，请安装pytesseract和opencv-python",
                "filename": filename
            }

        try:
            # 验证文件格式
            if filename:
                ext = filename.lower().split('.')[-1]
                if ext not in self.supported_formats:
                    return {
                        "success": False,
                        "error": f"不支持的文件格式: {ext}",
                        "filename": filename
                    }

            # 打开图片
            image = Image.open(io.BytesIO(image_data))

            # 预处理图片
            processed_image = self.preprocess_image(image)

            # 使用Tesseract进行OCR
            # 配置Tesseract参数，支持中英文
            config = '--oem 3 --psm 6 -l chi_sim+eng'
            text = pytesseract.image_to_string(processed_image, config=config)

            # 清理文本
            text = text.strip()

            return {
                "success": True,
                "text": text,
                "filename": filename,
                "text_length": len(text),
                "has_text": len(text) > 0
            }

        except Exception as e:
            logger.error(f"OCR处理失败 {filename}: {e}")
            return {
                "success": False,
                "error": str(e),
                "filename": filename
            }

    def process_multiple_images(self, image_files: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """批量处理多张图片"""
        results = []

        for i, file_info in enumerate(image_files):
            logger.info(f"正在处理第 {i+1}/{len(image_files)} 张图片: {file_info.get('filename', 'unknown')}")

            try:
                result = self.extract_text_from_image(
                    file_info['data'],
                    file_info.get('filename', f'image_{i+1}')
                )
                results.append(result)

            except Exception as e:
                results.append({
                    "success": False,
                    "error": str(e),
                    "filename": file_info.get('filename', f'image_{i+1}')
                })

        return results

    def get_batch_summary(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """获取批量处理结果汇总"""
        total_count = len(results)
        success_count = sum(1 for r in results if r.get('success', False))
        failed_count = total_count - success_count

        total_text_length = sum(r.get('text_length', 0) for r in results if r.get('success'))
        files_with_text = sum(1 for r in results if r.get('has_text', False))

        return {
            "total_files": total_count,
            "success_count": success_count,
            "failed_count": failed_count,
            "files_with_text": files_with_text,
            "total_text_length": total_text_length,
            "success_rate": round(success_count / total_count * 100, 2) if total_count > 0 else 0
        }

    def create_document_from_ocr(self, ocr_result: Dict[str, Any], source_path: str = "") -> Optional[Document]:
        """将OCR结果转换为知识库文档对象"""
        if not ocr_result.get('success') or not ocr_result.get('text'):
            return None

        try:
            # 清洗OCR文本
            text = ocr_result['text'].strip()
            if len(text) < 10:  # 文本太短，不值得加入知识库
                return None

            # 基本文本清洗
            import re
            # 去除多余的空白字符和换行
            cleaned_text = re.sub(r'\s+', ' ', text)
            cleaned_text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9\s\.\,\?\!\；\：\"\"\'\'\(\)\[\]\{\}]', '', cleaned_text)
            cleaned_text = cleaned_text.strip()

            # 按句子分割为段落
            paragraphs = self._split_ocr_text_to_paragraphs(cleaned_text)

            # 生成文档ID和标题
            filename = ocr_result.get('filename', 'unknown_image')
            doc_id = f"image_{filename}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            title = f"图片文字内容: {filename}"

            # 创建元数据
            metadata = {
                "source_type": "image_ocr",
                "source_path": source_path,
                "filename": filename,
                "text_length": len(cleaned_text),
                "paragraph_count": len(paragraphs),
                "ocr_confidence": "auto",  # Tesseract不提供置信度，标记为自动
                "processed_at": datetime.now().isoformat()
            }

            document = Document(
                id=doc_id,
                title=title,
                content=cleaned_text,
                paragraphs=paragraphs,
                metadata=metadata
            )

            logger.info(f"创建OCR文档: {doc_id}, 段落数: {len(paragraphs)}, 文字长度: {len(cleaned_text)}")
            return document

        except Exception as e:
            logger.error(f"创建OCR文档失败: {e}")
            return None

    def _split_ocr_text_to_paragraphs(self, text: str) -> List[str]:
        """将OCR文本智能分割为段落"""
        paragraphs = []

        # 按常见的分隔符分割
        # 首先按句号、问号、感叹号等分割
        import re
        sentences = re.split(r'[。！？\.\!\?]+', text)

        current_paragraph = ""
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            # 如果当前段落为空，直接添加句子
            if not current_paragraph:
                current_paragraph = sentence
            # 如果添加这个句子后长度合适，继续添加
            elif len(current_paragraph + sentence) < 200:
                current_paragraph += "。" + sentence
            # 否则结束当前段落，开始新段落
            else:
                if len(current_paragraph) > 20:  # 只保留有意义长度的段落
                    paragraphs.append(current_paragraph)
                current_paragraph = sentence

        # 添加最后一个段落
        if current_paragraph and len(current_paragraph) > 20:
            paragraphs.append(current_paragraph)

        # 如果分割后段落太少，直接使用原文本
        if not paragraphs and len(text) > 20:
            paragraphs = [text]

        return paragraphs

    def process_images_to_documents(self, image_files: List[Dict[str, Any]]) -> List[Document]:
        """批量处理图片并转换为知识库文档"""
        documents = []

        for file_info in image_files:
            try:
                # 进行OCR处理
                ocr_result = self.extract_text_from_image(
                    file_info['data'],
                    file_info.get('filename', 'unknown')
                )

                # 转换为文档对象
                document = self.create_document_from_ocr(
                    ocr_result,
                    file_info.get('source_path', '')
                )

                if document:
                    documents.append(document)

            except Exception as e:
                logger.error(f"处理图片到文档失败 {file_info.get('filename', 'unknown')}: {e}")
                continue

        logger.info(f"成功创建 {len(documents)} 个图片文档对象")
        return documents

# 全局实例
image_processor = ImageProcessor()

def setup_tesseract(tesseract_path: str):
    """设置Tesseract路径的快捷函数

    Args:
        tesseract_path: Tesseract可执行文件的完整路径

    Example:
        setup_tesseract(r'C:\Program Files\Tesseract-OCR\tesseract.exe')
    """
    global image_processor
    image_processor = ImageProcessor(tesseract_path)
    return image_processor.ocr_available

def process_single_image(image_data: bytes, filename: str = "") -> Dict[str, Any]:
    """处理单张图片的快捷函数"""
    return image_processor.extract_text_from_image(image_data, filename)

def process_batch_images(image_files: List[Dict[str, Any]]) -> Dict[str, Any]:
    """批量处理图片的快捷函数"""
    results = image_processor.process_multiple_images(image_files)
    summary = image_processor.get_batch_summary(results)

    return {
        "summary": summary,
        "results": results
    }

def create_document_from_image(image_data: bytes, filename: str = "", source_path: str = "") -> Optional[Document]:
    """从图片创建文档对象的快捷函数"""
    ocr_result = image_processor.extract_text_from_image(image_data, filename)
    return image_processor.create_document_from_ocr(ocr_result, source_path)

def process_images_to_documents(image_files: List[Dict[str, Any]]) -> List[Document]:
    """批量将图片转换为文档对象的快捷函数"""
    return image_processor.process_images_to_documents(image_files)