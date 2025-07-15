#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
（未实现）
图片文字识别处理模块
基于免费的Tesseract OCR实现
"""

import os
import io
import logging
from PIL import Image
import pytesseract
import cv2
import numpy as np
from typing import List, Dict, Any, Optional

# 配置日志
logger = logging.getLogger(__name__)

class ImageProcessor:
    """图片文字识别处理器"""

    def __init__(self):
        """初始化图片处理器"""
        self.supported_formats = {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'}
        self._check_tesseract()

    def _check_tesseract(self):
        """检查Tesseract是否可用"""
        try:
            pytesseract.get_tesseract_version()
            logger.info("Tesseract OCR 可用")
        except Exception as e:
            logger.error(f"Tesseract OCR 不可用: {e}")
            raise RuntimeError("请安装Tesseract OCR: https://github.com/UB-Mannheim/tesseract/wiki")

    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """图片预处理以提高OCR准确率"""
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

# 全局实例
image_processor = ImageProcessor()

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