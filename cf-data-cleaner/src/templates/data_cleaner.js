// 数据清洗页面HTML模板
export const dataCleanerHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI数据清洗工具</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .upload-area {
            border: 2px dashed #007bff;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            background: #f8f9fa;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .upload-area:hover {
            border-color: #0056b3;
            background: #e9ecef;
        }
        .content-area {
            height: 400px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            overflow-y: auto;
            background: #ffffff;
        }
        .original-content {
            background: #f8f9fa;
        }
        .cleaned-content {
            background: #e8f5e8;
        }
        .prompt-area {
            height: 200px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            resize: vertical;
        }
        .chunk-item {
            background: #ffffff;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .chunk-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-weight: bold;
            color: #495057;
        }
        .chunk-summary {
            font-weight: bold;
            color: #007bff;
            margin-bottom: 5px;
        }
        .chunk-keywords {
            margin-bottom: 5px;
        }
        .keyword-tag {
            background: #007bff;
            color: white;
            padding: 2px 6px;
            border-radius: 12px;
            font-size: 11px;
            margin-right: 4px;
        }
        .chunk-category {
            background: #28a745;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            display: inline-block;
            margin-bottom: 5px;
        }
        .chunk-search-vector {
            font-size: 12px;
            color: #6c757d;
            font-style: italic;
        }
        .btn-action {
            margin: 5px;
            border-radius: 25px;
            padding: 10px 25px;
            font-weight: bold;
        }
        .loading {
            display: none;
        }
        .status-message {
            margin-top: 10px;
            padding: 10px;
            border-radius: 5px;
            display: none;
        }
        .status-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-content {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #dee2e6;
            background: #f8f9fa;
            border-radius: 10px 10px 0 0;
        }
        .modal-header h5 {
            margin: 0;
            color: #495057;
            font-weight: bold;
        }
        .btn-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #6c757d;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
        }
        .btn-close:hover {
            background: #dc3545;
            color: white;
        }
        .modal-body {
            padding: 20px;
        }
        .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid #dee2e6;
            background: #f8f9fa;
            border-radius: 0 0 10px 10px;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        .form-label {
            font-weight: bold;
            color: #495057;
            margin-bottom: 5px;
            display: block;
        }
        .mb-3 {
            margin-bottom: 1rem;
        }
    </style>
</head>
<body class="bg-light">
    <div class="container-fluid py-4">
        <!-- 页面标题 -->
        <div class="row mb-4">
            <div class="col-12">
                <h1 class="text-center text-primary">
                    <i class="fas fa-magic"></i> AI数据清洗工具
                </h1>
                <p class="text-center text-muted">智能化数据清洗，高质量RAG知识库构建</p>
            </div>
        </div>

        <!-- 文本输入区域 -->
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5><i class="fas fa-edit"></i> 文本输入区域</h5>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label for="textInput" class="form-label">请输入要清洗的文本内容：</label>
                            <textarea class="form-control" id="textInput" rows="8" placeholder="在这里粘贴或输入需要清洗的文本内容..."></textarea>
                        </div>
                        <!-- 内容类型选择 -->
                        <div class="mb-3">
                            <label class="form-label">处理类型：</label>
                            <div class="btn-group" role="group">
                                <input type="radio" class="btn-check" name="contentType" id="textMode" value="text" checked>
                                <label class="btn btn-outline-primary" for="textMode">
                                    <i class="fas fa-font"></i> 文本处理
                                </label>
                                <input type="radio" class="btn-check" name="contentType" id="imageMode" value="image">
                                <label class="btn btn-outline-primary" for="imageMode">
                                    <i class="fas fa-image"></i> 图片识别
                                </label>
                            </div>
                        </div>

                        <!-- 文本上传区域 -->
                        <div class="upload-area" id="textUploadArea">
                            <i class="fas fa-cloud-upload-alt fa-2x text-primary mb-2"></i>
                            <p>或者拖拽 .txt 文本文件到这里</p>
                            <input type="file" id="textFileInput" accept=".txt" style="display: none;">
                        </div>

                        <!-- 图片上传区域 -->
                        <div class="upload-area" id="imageUploadArea" style="display: none;">
                            <i class="fas fa-image fa-2x text-success mb-2"></i>
                            <p>拖拽图片文件到这里或点击选择</p>
                            <input type="file" id="imageFileInput" accept="image/*" style="display: none;">
                            <div id="imagePreview" class="mt-3" style="display: none;">
                                <img id="previewImg" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
                            </div>
                        </div>
                        <div class="d-flex justify-content-end mt-3">
                            <button class="btn btn-primary btn-action" id="cleanBtn" disabled>
                                <i class="fas fa-broom"></i> 数据清洗
                            </button>
                            <button class="btn btn-success btn-action" id="saveBtn" disabled>
                                <i class="fas fa-database"></i> 保存到数据库
                            </button>
                            <a href="/data_viewer/" class="btn btn-info btn-action">
                                <i class="fas fa-eye"></i> 查看数据
                            </a>
                        </div>
                        <div class="status-message" id="statusMessage"></div>
                        <div class="loading" id="loadingIndicator">
                            <div class="d-flex align-items-center">
                                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                                <span>AI正在处理中，请稍候...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 内容显示区域 -->
        <div class="row mb-4">
            <div class="col-6">
                <div class="card h-100">
                    <div class="card-header">
                        <h5><i class="fas fa-file-alt"></i> 原文</h5>
                    </div>
                    <div class="card-body">
                        <div class="content-area original-content" id="originalContent">
                            <p class="text-muted text-center">这里是原文区域</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-6">
                <div class="card h-100">
                    <div class="card-header">
                        <h5><i class="fas fa-sparkles"></i> 清洗结果</h5>
                    </div>
                    <div class="card-body">
                        <div class="content-area cleaned-content" id="cleanedContent">
                            <p class="text-muted text-center">
                                <i class="fas fa-sparkles"></i> 这里是清洗后的数据展示结果<br>
                                <small>数据清洗完成后，点击每个段落的<strong>编辑</strong>按钮可修改所有字段</small>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- System Prompt 配置区域 -->
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5><i class="fas fa-cog"></i> System Prompt 配置</h5>
                        <button class="btn btn-sm btn-outline-primary" id="resetPromptBtn">
                            <i class="fas fa-undo"></i> 重置默认
                        </button>
                    </div>
                    <div class="card-body">
                        <textarea class="form-control prompt-area" id="systemPrompt" placeholder="在这里编辑数据清洗的System Prompt...">正在加载默认提示词...</textarea>
                        <small class="form-text text-muted mt-2">
                            <i class="fas fa-info-circle"></i>
                            修改此提示词可以调整AI的数据清洗策略和输出格式
                        </small>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // 全局变量
        let originalText = '';
        let originalImage = null;
        let cleanedData = null;
        let defaultPrompt = '';
        let currentMode = 'text'; // 'text' or 'image'

        // API 基础URL - 自动使用当前域名
        const API_BASE_URL = window.location.origin;

        // DOM 元素
        const textInput = document.getElementById('textInput');
        const textUploadArea = document.getElementById('textUploadArea');
        const imageUploadArea = document.getElementById('imageUploadArea');
        const textFileInput = document.getElementById('textFileInput');
        const imageFileInput = document.getElementById('imageFileInput');
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        const textModeBtn = document.getElementById('textMode');
        const imageModeBtn = document.getElementById('imageMode');
        const originalContent = document.getElementById('originalContent');
        const cleanedContent = document.getElementById('cleanedContent');
        const cleanBtn = document.getElementById('cleanBtn');
        const saveBtn = document.getElementById('saveBtn');
        const systemPrompt = document.getElementById('systemPrompt');
        const resetPromptBtn = document.getElementById('resetPromptBtn');
        const statusMessage = document.getElementById('statusMessage');
        const loadingIndicator = document.getElementById('loadingIndicator');

        // 初始化
        document.addEventListener('DOMContentLoaded', function() {
            loadDefaultPrompt();
            setupEventListeners();
        });

        // 设置事件监听器
        function setupEventListeners() {
            // 模式切换监听
            textModeBtn.addEventListener('change', function() {
                if (this.checked) {
                    switchMode('text');
                }
            });
            imageModeBtn.addEventListener('change', function() {
                if (this.checked) {
                    switchMode('image');
                }
            });

            // 文本输入监听
            textInput.addEventListener('input', function() {
                const text = this.value.trim();
                if (text) {
                    displayOriginalText(text);
                    updateCleanButtonState();
                } else {
                    updateCleanButtonState();
                }
            });

            // 文本文件上传相关事件
            textUploadArea.addEventListener('click', () => textFileInput.click());
            textUploadArea.addEventListener('dragover', handleDragOver);
            textUploadArea.addEventListener('drop', handleDrop);
            textUploadArea.addEventListener('dragleave', handleDragLeave);
            textFileInput.addEventListener('change', handleTextFileSelect);

            // 图片文件上传相关事件
            imageUploadArea.addEventListener('click', () => imageFileInput.click());
            imageUploadArea.addEventListener('dragover', handleDragOver);
            imageUploadArea.addEventListener('drop', handleImageDrop);
            imageUploadArea.addEventListener('dragleave', handleDragLeave);
            imageFileInput.addEventListener('change', handleImageFileSelect);

            // 按钮事件
            cleanBtn.addEventListener('click', performDataCleaning);
            saveBtn.addEventListener('click', saveToDatabase);
            resetPromptBtn.addEventListener('click', resetPrompt);
        }

        // 模式切换
        function switchMode(mode) {
            currentMode = mode;
            if (mode === 'text') {
                textUploadArea.style.display = 'block';
                imageUploadArea.style.display = 'none';
                textInput.parentElement.style.display = 'block';
            } else {
                textUploadArea.style.display = 'none';
                imageUploadArea.style.display = 'block';
                textInput.parentElement.style.display = 'none';
            }

            // 重置状态
            originalText = '';
            originalImage = null;
            cleanedData = null;
            originalContent.innerHTML = '<p class="text-muted text-center">这里是原文区域</p>';
            cleanedContent.innerHTML = '<p class="text-muted text-center"><i class="fas fa-sparkles"></i> 这里是清洗后的数据展示结果<br><small>数据清洗完成后，点击每个段落的<strong>编辑</strong>按钮可修改所有字段</small></p>';
            updateCleanButtonState();
            saveBtn.disabled = true;

            showStatus(mode === 'text' ? '切换到文本处理模式' : '切换到图片识别模式', 'success');
        }

        // 更新清洗按钮状态
        function updateCleanButtonState() {
            if (currentMode === 'text') {
                cleanBtn.disabled = !textInput.value.trim();
            } else {
                cleanBtn.disabled = !originalImage;
            }
        }

        // 拖拽上传事件处理
        function handleDragOver(e) {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '#e9ecef';
        }

        function handleDragLeave(e) {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '#f8f9fa';
        }

        function handleDrop(e) {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                processTextFile(files[0]);
            }
        }

        function handleImageDrop(e) {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                processImageFile(files[0]);
            }
        }

        function handleTextFileSelect(e) {
            const files = e.target.files;
            if (files.length > 0) {
                processTextFile(files[0]);
            }
        }

        function handleImageFileSelect(e) {
            const files = e.target.files;
            if (files.length > 0) {
                processImageFile(files[0]);
            }
        }

        // 处理文本文件
        async function processTextFile(file) {
            if (!file.name.endsWith('.txt')) {
                showStatus('只支持 .txt 文本文件', 'error');
                return;
            }

            try {
                const text = await readTextFile(file);
                textInput.value = text;
                displayOriginalText(text);
                updateCleanButtonState();
                showStatus('文本文件读取成功', 'success');
            } catch (error) {
                showStatus('文件读取失败: ' + error.message, 'error');
            }
        }

        // 处理图片文件
        async function processImageFile(file) {
            if (!file.type.startsWith('image/')) {
                showStatus('只支持图片文件', 'error');
                return;
            }

            // 检查文件大小 (限制为10MB)
            if (file.size > 10 * 1024 * 1024) {
                showStatus('图片文件过大，请选择小于10MB的图片', 'error');
                return;
            }

            try {
                const imageDataUrl = await readImageFile(file);
                originalImage = imageDataUrl;
                displayOriginalImage(imageDataUrl, file.name);
                updateCleanButtonState();
                showStatus('图片加载成功', 'success');
            } catch (error) {
                showStatus('图片读取失败: ' + error.message, 'error');
            }
        }

        // 读取图片文件为Base64
        function readImageFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        // 读取文本文件
        function readTextFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file, 'UTF-8');
            });
        }

        // 显示原始文本
        function displayOriginalText(text) {
            originalText = text;
            originalContent.innerHTML = '<pre style="white-space: pre-wrap; font-family: inherit;">' + escapeHtml(text) + '</pre>';
        }

        // 显示原始图片
        function displayOriginalImage(imageDataUrl, fileName) {
            originalContent.innerHTML =
                '<div class="text-center">' +
                '<h6 class="mb-3"><i class="fas fa-image"></i> ' + escapeHtml(fileName) + '</h6>' +
                '<img src="' + imageDataUrl + '" style="max-width: 100%; max-height: 350px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">' +
                '</div>';

            // 同时在上传区域显示预览
            previewImg.src = imageDataUrl;
            imagePreview.style.display = 'block';
        }

        // 加载默认提示词
        async function loadDefaultPrompt() {
            try {
                const response = await fetch(API_BASE_URL + '/data_cleaner/get_default_prompt');
                const data = await response.json();
                if (data.success) {
                    defaultPrompt = data.prompt;
                    systemPrompt.value = defaultPrompt;
                }
            } catch (error) {
                console.error('加载默认提示词失败:', error);
            }
        }

        // 执行数据清洗
        async function performDataCleaning() {
            const prompt = systemPrompt.value.trim();
            if (!prompt) {
                showStatus('请配置System Prompt', 'error');
                return;
            }

            showLoading(true);
            cleanBtn.disabled = true;

            try {
                let response, requestData;

                if (currentMode === 'text') {
                    const text = textInput.value.trim();
                    if (!text) {
                        showStatus('请输入文本内容', 'error');
                        return;
                    }

                    requestData = {
                        text: text,
                        system_prompt: prompt,
                        content_type: 'text'
                    };
                    response = await fetch(API_BASE_URL + '/data_cleaner/clean_data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });
                } else {
                    if (!originalImage) {
                        showStatus('请选择图片文件', 'error');
                        return;
                    }

                    requestData = {
                        image: originalImage,
                        system_prompt: prompt,
                        content_type: 'image'
                    };
                    response = await fetch(API_BASE_URL + '/data_cleaner/clean_image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData)
                    });
                }

                const result = await response.json();
                if (result.success) {
                    cleanedData = result.cleaned_data;
                    displayCleanedData(cleanedData);
                    saveBtn.disabled = false;
                    showStatus(currentMode === 'text' ? '文本清洗完成' : '图片识别完成', 'success');
                } else {
                    showStatus('处理失败: ' + result.error, 'error');
                }
            } catch (error) {
                showStatus('请求失败: ' + error.message, 'error');
            } finally {
                showLoading(false);
                updateCleanButtonState();
            }
        }

        // 显示清洗后的数据
        function displayCleanedData(data) {
            if (!data || !data.chunks) {
                cleanedContent.innerHTML = '<p class="text-danger">清洗数据格式错误</p>';
                return;
            }

            let html = '';
            data.chunks.forEach((chunk, index) => {
                html += '<div class="chunk-item" data-index="' + index + '">';
                html += '<div class="chunk-header">';
                html += '<span>段落 ' + (index + 1) + '</span>';
                html += '<button class="btn btn-sm btn-outline-primary edit-chunk-btn" data-index="' + index + '">';
                html += '<i class="fas fa-edit"></i> 编辑</button>';
                html += '</div>';
                html += '<div class="chunk-summary">' + escapeHtml(chunk.summary || '') + '</div>';
                html += '<div class="chunk-keywords">';
                (chunk.keywords || []).forEach(kw => {
                    html += '<span class="keyword-tag">' + escapeHtml(kw) + '</span>';
                });
                html += '</div>';
                html += '<div class="chunk-category">' + escapeHtml(chunk.category || '') + '</div>';
                html += '<div class="chunk-search-vector">' + escapeHtml(chunk.search_vector || '') + '</div>';
                html += '</div>';
            });

            cleanedContent.innerHTML = html;

            // 绑定编辑按钮事件
            document.querySelectorAll('.edit-chunk-btn').forEach(btn => {
                btn.addEventListener('click', editChunk);
            });
        }

        // 编辑段落 (完整版本)
        function editChunk(e) {
            const index = parseInt(e.target.closest('.edit-chunk-btn').dataset.index);
            const chunk = cleanedData.chunks[index];

            // 创建完整的编辑模态框
            showEditModal(index, chunk);
        }

        // 显示编辑模态框
        function showEditModal(index, chunk) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = '<div class="modal-content" onclick="event.stopPropagation()"><div class="modal-header"><h5>编辑段落 ' + (index + 1) + '</h5><button type="button" class="btn-close" onclick="closeEditModal()">×</button></div><div class="modal-body"><div class="mb-3"><label class="form-label">摘要</label><textarea class="form-control" id="edit-summary" rows="2" placeholder="段落摘要">' + escapeHtml(chunk.summary || '') + '</textarea></div><div class="mb-3"><label class="form-label">关键词（用逗号分隔）</label><input type="text" class="form-control" id="edit-keywords" placeholder="关键词1,关键词2,关键词3" value="' + (chunk.keywords || []).join(',') + '"></div><div class="mb-3"><label class="form-label">分类</label><input type="text" class="form-control" id="edit-category" placeholder="内容分类" value="' + escapeHtml(chunk.category || '') + '"></div><div class="mb-3"><label class="form-label">搜索向量文本</label><textarea class="form-control" id="edit-search-vector" rows="3" placeholder="优化后的搜索文本">' + escapeHtml(chunk.search_vector || '') + '</textarea></div></div><div class="modal-footer"><button type="button" class="btn btn-secondary" onclick="closeEditModal()">取消</button><button type="button" class="btn btn-primary" onclick="saveChunkEdit(' + index + ')">保存修改</button></div></div>';

            // 点击背景关闭模态框
            modal.addEventListener('click', closeEditModal);

            // ESC键关闭模态框
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    closeEditModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);

            document.body.appendChild(modal);

            // 聚焦到第一个输入框
            setTimeout(() => {
                const summaryInput = document.getElementById('edit-summary');
                if (summaryInput) {
                    summaryInput.focus();
                }
            }, 100);
        }

        // 保存段落编辑
        function saveChunkEdit(index) {
            const summary = document.getElementById('edit-summary').value.trim();
            const keywordsText = document.getElementById('edit-keywords').value.trim();
            const category = document.getElementById('edit-category').value.trim();
            const searchVector = document.getElementById('edit-search-vector').value.trim();

            // 处理关键词：按逗号分割并去除空格
            const keywords = keywordsText ? keywordsText.split(',').map(kw => kw.trim()).filter(kw => kw) : [];

            // 更新数据
            cleanedData.chunks[index] = {
                summary: summary,
                keywords: keywords,
                category: category,
                search_vector: searchVector
            };

            // 刷新显示
            displayCleanedData(cleanedData);
            closeEditModal();

            showStatus('段落编辑已保存', 'success');
        }

        // 关闭编辑模态框
        function closeEditModal() {
            const modal = document.querySelector('.modal-overlay');
            if (modal) {
                modal.remove();
            }
        }

        // 保存到数据库
        async function saveToDatabase() {
            if (!cleanedData) {
                showStatus('没有清洗后的数据可保存', 'error');
                return;
            }

            showLoading(true);
            saveBtn.disabled = true;

            try {
                const requestData = {
                    cleaned_data: cleanedData,
                    content_type: currentMode
                };

                // 根据当前模式添加对应的原始数据
                if (currentMode === 'text') {
                    requestData.original_text = originalText;
                } else {
                    requestData.original_text = '[图片内容]'; // 简化存储，主要存储识别结果
                    requestData.original_image = originalImage;
                }

                const response = await fetch(API_BASE_URL + '/data_cleaner/save_data', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData)
                });

                const result = await response.json();
                if (result.success) {
                    showStatus('数据保存成功，记录ID: ' + result.record_id, 'success');
                } else {
                    showStatus('数据保存失败: ' + result.error, 'error');
                }
            } catch (error) {
                showStatus('请求失败: ' + error.message, 'error');
            } finally {
                showLoading(false);
                saveBtn.disabled = false;
            }
        }

        // 重置提示词
        function resetPrompt() {
            systemPrompt.value = defaultPrompt;
            showStatus('已重置为默认提示词', 'success');
        }

        // 工具函数
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showStatus(message, type) {
            statusMessage.textContent = message;
            statusMessage.className = 'status-message status-' + type;
            statusMessage.style.display = 'block';
            if (type === 'success') {
                setTimeout(() => hideStatus(), 3000);
            }
        }

        function hideStatus() {
            statusMessage.style.display = 'none';
        }

        function showLoading(show) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    </script>
</body>
</html>`;