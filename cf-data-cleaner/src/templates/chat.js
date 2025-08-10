export const chatHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI知识问答 - RAG对话</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .chat-container {
            max-width: 1000px;
            margin: 0 auto;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .chat-header {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px 15px 0 0;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .chat-messages {
            flex: 1;
            background: rgba(255,255,255,0.9);
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .chat-input-area {
            background: rgba(255,255,255,0.95);
            backdrop-filter: blur(10px);
            border-radius: 0 0 15px 15px;
            padding: 20px;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        }

        .message {
            display: flex;
            margin-bottom: 15px;
            animation: fadeInUp 0.3s ease;
        }

        .message.user {
            justify-content: flex-end;
        }

        .message.assistant {
            justify-content: flex-start;
        }

        .message-content {
            max-width: 70%;
            padding: 12px 18px;
            border-radius: 18px;
            position: relative;
            word-wrap: break-word;
        }

        .message.user .message-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            margin-left: auto;
        }

        .message.assistant .message-content {
            background: #f8f9fa;
            color: #333;
            border: 1px solid #e9ecef;
        }

        .message-avatar {
            width: 35px;
            height: 35px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 10px;
            font-size: 16px;
        }

        .user-avatar {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .assistant-avatar {
            background: #28a745;
            color: white;
        }

        .typing-indicator {
            display: none;
            padding: 12px 18px;
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 18px;
            max-width: 70px;
        }

        .typing-dots {
            display: flex;
            gap: 4px;
        }

        .typing-dots span {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #6c757d;
            animation: typing 1.4s infinite ease-in-out;
        }

        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes typing {
            0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .input-group {
            position: relative;
        }

        .chat-input {
            border-radius: 25px;
            border: 2px solid #e9ecef;
            padding: 12px 50px 12px 15px;
            resize: none;
            min-height: 50px;
            max-height: 120px;
        }

        .chat-input:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
        }

        .send-btn {
            position: absolute;
            right: 5px;
            top: 50%;
            transform: translateY(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
        }

        .send-btn:hover {
            transform: translateY(-50%) scale(1.1);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .send-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .settings-panel {
            background: rgba(255,255,255,0.95);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            border: 1px solid #e9ecef;
        }

        .knowledge-sources {
            background: rgba(255,255,255,0.95);
            border-radius: 10px;
            padding: 15px;
            margin-top: 10px;
            border: 1px solid #e9ecef;
            max-height: 200px;
            overflow-y: auto;
        }

        .source-item {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 8px;
            border-left: 4px solid #28a745;
        }

        .source-title {
            font-weight: bold;
            color: #495057;
            font-size: 14px;
        }

        .source-content {
            color: #6c757d;
            font-size: 13px;
            margin-top: 5px;
            line-height: 1.4;
        }

        .message-time {
            font-size: 11px;
            color: #6c757d;
            margin-top: 5px;
            text-align: right;
        }

        .assistant .message-time {
            text-align: left;
        }

        .stats-info {
            display: flex;
            gap: 20px;
            font-size: 12px;
            color: #6c757d;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container-fluid p-3">
        <div class="chat-container">
            <!-- 聊天头部 -->
            <div class="chat-header">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <h1 class="h4 mb-2">
                            <i class="fas fa-brain text-primary"></i>
                            AI知识问答
                        </h1>
                        <p class="text-muted mb-0">基于知识库的智能问答系统 - RAG技术驱动</p>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-outline-primary btn-sm" data-bs-toggle="collapse" data-bs-target="#settingsPanel">
                            <i class="fas fa-cog"></i> 设置
                        </button>
                        <a href="/" class="btn btn-outline-secondary btn-sm ms-2">
                            <i class="fas fa-home"></i> 返回
                        </a>
                    </div>
                </div>

                <!-- 设置面板 -->
                <div class="collapse mt-3" id="settingsPanel">
                    <div class="settings-panel">
                        <div class="row">
                            <div class="col-md-6">
                                <h6><i class="fas fa-globe"></i> 语言设置</h6>
                                <select class="form-select mb-3" id="languageSelect">
                                    <option value="auto">🌐 自动检测</option>
                                    <option value="zh" selected>🇨🇳 中文</option>
                                    <option value="en">🇺🇸 English</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <h6><i class="fas fa-robot"></i> 系统提示词</h6>
                                <button class="btn btn-outline-secondary btn-sm" id="loadDefaultPrompt">
                                    <i class="fas fa-sync"></i> 加载默认
                                </button>
                            </div>
                        </div>
                        <textarea class="form-control" id="systemPrompt" rows="4" placeholder="设置AI助手的行为和回答风格...">正在加载默认提示词...</textarea>
                        <div class="mt-2">
                            <small class="text-muted">
                                <i class="fas fa-info-circle"></i>
                                <span id="promptHint">使用 {KNOWLEDGE_CONTEXT} 和 {USER_QUESTION} 作为占位符</span>
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 聊天消息区域 -->
            <div class="chat-messages" id="chatMessages">
                <!-- 欢迎消息 -->
                <div class="message assistant">
                    <div class="message-avatar assistant-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <div>👋 您好！我是您的 AI 知识助手。</div>
                        <div class="mt-2">我可以基于知识库为您回答问题。请直接提问，我会检索相关信息并提供详细解答。</div>
                        <div class="message-time" data-time="now"></div>
                    </div>
                </div>
            </div>

            <!-- 输入区域 -->
            <div class="chat-input-area">
                <div class="input-group">
                    <textarea class="form-control chat-input" id="messageInput"
                              placeholder="输入您的问题...（支持回车发送，Shift+回车换行）"
                              rows="1"></textarea>
                    <button class="send-btn" id="sendBtn" type="button">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="stats-info mt-2">
                    <span><i class="fas fa-database"></i> 知识库状态: <span id="dbStatus">检查中...</span></span>
                    <span><i class="fas fa-clock"></i> 最后更新: <span id="lastUpdate">--</span></span>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>

    <script>
                // 全局变量
        const API_BASE_URL = window.location.origin;
        const chatMessages = document.getElementById('chatMessages');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const systemPrompt = document.getElementById('systemPrompt');
        const languageSelect = document.getElementById('languageSelect');
        const loadDefaultPrompt = document.getElementById('loadDefaultPrompt');
        const promptHint = document.getElementById('promptHint');
        const dbStatus = document.getElementById('dbStatus');
        const lastUpdate = document.getElementById('lastUpdate');

        let isProcessing = false;
        let currentLanguage = 'zh';

                // 初始化
        document.addEventListener('DOMContentLoaded', function() {
            initEventListeners();
            checkKnowledgeBase();
            updateTimestamps();
            loadDefaultPromptForLanguage();
            updateUILanguage();

            // 自动调整输入框高度
            messageInput.addEventListener('input', autoResizeTextarea);
        });

        // 事件监听
        function initEventListeners() {
            sendBtn.addEventListener('click', sendMessage);
            loadDefaultPrompt.addEventListener('click', loadDefaultPromptForLanguage);
            languageSelect.addEventListener('change', onLanguageChange);

            messageInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                } else if (e.key === 'Enter' && e.shiftKey) {
                    // 允许换行
                }
            });
        }

        // 语言切换事件
        async function onLanguageChange() {
            currentLanguage = languageSelect.value;
            updateUILanguage();
            await loadDefaultPromptForLanguage();
            await checkKnowledgeBase();
        }

        // 更新界面语言
        function updateUILanguage() {
            if (currentLanguage === 'zh') {
                promptHint.textContent = '使用 {KNOWLEDGE_CONTEXT} 和 {USER_QUESTION} 作为占位符';
                messageInput.placeholder = '输入您的问题...（支持回车发送，Shift+回车换行）';
            } else {
                promptHint.textContent = 'Use {KNOWLEDGE_CONTEXT} and {USER_QUESTION} as placeholders';
                messageInput.placeholder = 'Enter your question... (Enter to send, Shift+Enter for new line)';
            }
        }

                        // 为当前语言加载默认提示词
        async function loadDefaultPromptForLanguage() {
            try {
                const language = currentLanguage === 'auto' ? 'en' : currentLanguage;
                const response = await fetch(\`\${API_BASE_URL}/data_cleaner/get_default_prompt?language=\${language}&type=chat\`);
                const result = await response.json();

                if (result.success) {
                    systemPrompt.value = result.prompt;
                }
            } catch (error) {
                console.error('加载默认提示词失败:', error);
            }
        }

        // 自动调整文本框高度
        function autoResizeTextarea() {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
        }

                        // 检查知识库状态
        async function checkKnowledgeBase() {
            try {
                const response = await fetch(\`\${API_BASE_URL}/data_cleaner/data_list?limit=1\`);
                const result = await response.json();

                if (result.success) {
                    const statusText = currentLanguage === 'zh' ?
                        \`正常 (\${result.statistics.total_records}条记录)\` :
                        \`Normal (\${result.statistics.total_records} records)\`;
                    dbStatus.textContent = statusText;
                    dbStatus.className = 'text-success';
                } else {
                    const errorText = currentLanguage === 'zh' ? '连接失败' : 'Connection Failed';
                    dbStatus.textContent = errorText;
                    dbStatus.className = 'text-danger';
                }
            } catch (error) {
                const errorText = currentLanguage === 'zh' ? '连接失败' : 'Connection Failed';
                dbStatus.textContent = errorText;
                dbStatus.className = 'text-danger';
            }
        }

        // 更新时间戳
        function updateTimestamps() {
            const timeElements = document.querySelectorAll('[data-time="now"]');
            const now = new Date().toLocaleTimeString('zh-CN');
            timeElements.forEach(el => {
                el.textContent = now;
                el.removeAttribute('data-time');
            });
            lastUpdate.textContent = now;
        }

        // 发送消息
        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message || isProcessing) return;

            isProcessing = true;
            sendBtn.disabled = true;

            try {
                // 添加用户消息
                addMessage('user', message);
                messageInput.value = '';
                autoResizeTextarea();

                // 显示正在思考
                showTypingIndicator();

                // 调用RAG对话API
                const response = await fetch(\`\${API_BASE_URL}/chat/ask\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        question: message,
                        system_prompt: systemPrompt.value,
                        language: currentLanguage
                    })
                });

                const result = await response.json();

                // 隐藏正在思考
                hideTypingIndicator();

                                                if (result.success) {
                    // 添加AI回复
                    addMessage('assistant', result.answer, result.sources, result.stats);
                } else {
                    const errorMsg = currentLanguage === 'zh' ?
                        '抱歉，处理您的问题时出现了错误：' + result.error :
                        'Sorry, an error occurred while processing your question: ' + result.error;
                    addMessage('assistant', errorMsg);
                }

            } catch (error) {
                hideTypingIndicator();
                const networkErrorMsg = currentLanguage === 'zh' ?
                    '抱歉，网络连接出现问题，请稍后重试。' :
                    'Sorry, there was a network connection issue. Please try again later.';
                addMessage('assistant', networkErrorMsg);
                console.error('发送消息失败:', error);
            } finally {
                isProcessing = false;
                sendBtn.disabled = false;
                messageInput.focus();
            }
        }

        // 添加消息
        function addMessage(role, content, sources = null, stats = null) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}\`;

            const avatar = role === 'user' ?
                '<div class="message-avatar user-avatar"><i class="fas fa-user"></i></div>' :
                '<div class="message-avatar assistant-avatar"><i class="fas fa-robot"></i></div>';

            const time = new Date().toLocaleTimeString('zh-CN');

                        let sourcesHtml = '';
            if (sources && sources.length > 0) {
                const sourcesTitle = currentLanguage === 'zh' ?
                    \`参考知识源 (\${sources.length}条)\` :
                    \`Reference Sources (\${sources.length} items)\`;
                const fragmentPrefix = currentLanguage === 'zh' ? '知识片段' : 'Fragment';
                const uncategorized = currentLanguage === 'zh' ? '未分类' : 'Uncategorized';

                sourcesHtml = \`
                    <div class="knowledge-sources">
                        <h6 class="mb-2"><i class="fas fa-book"></i> \${sourcesTitle}</h6>
                        \${sources.map((source, index) => \`
                            <div class="source-item">
                                <div class="source-title">\${fragmentPrefix} \${index + 1} - \${source.category || uncategorized}</div>
                                <div class="source-content">\${escapeHtml(source.content.substring(0, 200))}\${source.content.length > 200 ? '...' : ''}</div>
                            </div>
                        \`).join('')}
                    </div>
                \`;
            }

            let statsHtml = '';
            if (stats) {
                const searchLabel = currentLanguage === 'zh' ? '检索耗时' : 'Search Time';
                const aiLabel = currentLanguage === 'zh' ? 'AI响应' : 'AI Response';
                const matchesLabel = currentLanguage === 'zh' ? '命中' : 'Matches';
                const matchesUnit = currentLanguage === 'zh' ? '条' : '';

                statsHtml = \`
                    <div class="stats-info">
                        <span><i class="fas fa-search"></i> \${searchLabel}: \${stats.search_time}ms</span>
                        <span><i class="fas fa-brain"></i> \${aiLabel}: \${stats.ai_time}ms</span>
                        <span><i class="fas fa-database"></i> \${matchesLabel}: \${stats.total_matches}\${matchesUnit}</span>
                    </div>
                \`;
            }

            messageDiv.innerHTML = role === 'user' ? \`
                <div class="message-content">
                    <div>\${escapeHtml(content)}</div>
                    <div class="message-time">\${time}</div>
                </div>
                \${avatar}
            \` : \`
                \${avatar}
                <div class="message-content">
                    <div>\${formatAIResponse(content)}</div>
                    \${sourcesHtml}
                    \${statsHtml}
                    <div class="message-time">\${time}</div>
                </div>
            \`;

            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // 显示正在输入指示器
        function showTypingIndicator() {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message assistant';
            typingDiv.id = 'typingIndicator';
            typingDiv.innerHTML = \`
                <div class="message-avatar assistant-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="typing-indicator" style="display: block;">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            \`;

            chatMessages.appendChild(typingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // 隐藏正在输入指示器
        function hideTypingIndicator() {
            const typingIndicator = document.getElementById('typingIndicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        // 格式化AI回复（支持Markdown基本格式）
        function formatAIResponse(content) {
            return content
                .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
                .replace(/\`(.*?)\`/g, '<code>$1</code>')
                .replace(/\\n/g, '<br>')
                .replace(/(\\d+\\.\\s)/g, '<br>$1');
        }

        // HTML转义
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;