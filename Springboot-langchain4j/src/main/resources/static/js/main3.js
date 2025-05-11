document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const chatMode = document.getElementById('chatMode');
    const conversationIdContainer = document.getElementById('conversationIdContainer');
    const conversationId = document.getElementById('conversationId');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const newChatBtn = document.getElementById('newChat');
    const conversationsList = document.getElementById('conversationsList');

    // 当前对话历史
    let conversations = [];
    let activeConversationIndex = null;
    let currentEventSource = null; // 跟踪当前活动的EventSource
    let currentAiMessageElement = null; // 跟踪当前正在接收内容的AI消息元素
    let currentAiMessageContentElement = null; // 跟踪当前AI消息的内容DOM元素
    let streamSuccessfullyClosed = false; // 用于跟踪流是否已成功关闭

    // --- 节流函数 ---
    function throttle(func, limit) {
      let inThrottle;
      return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      }
    }

    // --- 辅助函数：滚动到底部 ---
    function scrollToBottom() {
        console.log("Scrolling to bottom"); // 调试滚动
        // 使用平滑滚动效果更好
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
        // 或者立即滚动： chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- 节流后的滚动函数 ---
    const throttledScrollToBottom = throttle(scrollToBottom, 100); // 每100ms最多执行一次

    // 初始化
    init();

    // --- 事件监听等 (保持不变，除非特别指出) ---
    chatMode.addEventListener('change', function() {
        const mode = chatMode.value;
        if (mode.includes('Id')) {
            conversationIdContainer.classList.remove('hidden');
        } else {
            conversationIdContainer.classList.add('hidden');
        }
        if (currentEventSource) {
            console.log("聊天模式改变，关闭当前流。");
            streamSuccessfullyClosed = true; // 认为流被手动中断，标记关闭
            currentEventSource.close();
            currentEventSource = null;
            if (currentAiMessageContentElement && !currentAiMessageContentElement.textContent.includes("已中止")) {
                currentAiMessageContentElement.innerHTML += formatMessage("\n\n(流已中止)");
            }
            saveConversations();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    newChatBtn.addEventListener('click', function() {
        if (currentEventSource) {
            streamSuccessfullyClosed = true; // 认为流被手动中断
            currentEventSource.close();
            currentEventSource = null;
        }
        currentAiMessageElement = null;
        currentAiMessageContentElement = null;

        const newConversation = { id: Date.now(), messages: [] };
        conversations.push(newConversation);
        saveConversations();
        switchConversation(conversations.length - 1);
    });

    // --- 辅助函数：创建消息DOM元素 (保持不变) ---
    function createMessageElement(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role}`;
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = formatMessage(message.content || '');
        messageElement.appendChild(messageContent);
        return messageElement;
    }

    // --- 初始化函数 (保持不变) ---
    function init() {
        loadConversations();
        if (conversations.length > 0) {
            switchConversation(0);
        } else {
            newChatBtn.click();
        }
         chatMode.dispatchEvent(new Event('change'));
    }

    // --- 加载/保存/渲染列表/获取名称/切换对话/渲染消息 (基本保持不变) ---
    function loadConversations() {
        // ... (代码同前)
        const savedConversations = localStorage.getItem('conversations');
        try {
            if (savedConversations) {
                conversations = JSON.parse(savedConversations);
                if (!Array.isArray(conversations)) {
                    console.warn("本地存储中的对话数据格式无效，已重置。");
                    conversations = [];
                }
                conversations = conversations.filter(conv => conv && typeof conv === 'object');
            } else {
                conversations = [];
            }
        } catch (e) {
            console.error("从本地存储解析对话失败:", e);
            conversations = [];
        }
    }

    function saveConversations() {
         console.log("Saving conversations..."); // 调试保存
        localStorage.setItem('conversations', JSON.stringify(conversations));
    }

    function renderConversationsList() {
        // ... (代码同前)
        conversationsList.innerHTML = '';
        conversations.forEach((conversation, index) => {
            const li = document.createElement('li');
             if (!conversation || typeof conversation !== 'object') {
                 console.warn(`跳过无效的对话数据，索引: ${index}`);
                 return;
             }
            const conversationName = getConversationName(conversation);
            li.textContent = conversationName;
            li.dataset.index = index;

            if (index === activeConversationIndex) {
                li.classList.add('active');
            }
            li.addEventListener('click', function() {
                 const indexToSwitch = parseInt(this.dataset.index, 10);
                 if (currentEventSource) {
                     streamSuccessfullyClosed = true; // 切换时也认为流中断
                     currentEventSource.close();
                     currentEventSource = null;
                 }
                 currentAiMessageElement = null;
                 currentAiMessageContentElement = null;
                 switchConversation(indexToSwitch);
            });
            conversationsList.appendChild(li);
        });
    }

    function getConversationName(conversation) {
        // ... (代码同前)
        if (!conversation || !Array.isArray(conversation.messages)) {
             return `无效对话 ${conversation ? conversation.id : '未知'}`;
         }
        if (conversation.messages.length > 0) {
            const firstUserMessage = conversation.messages.find(msg => msg.role === 'user' && msg.content);
            if (firstUserMessage) {
                const name = firstUserMessage.content.slice(0, 20).replace(/\n/g, ' ');
                return name + (name.length < firstUserMessage.content.length ? '...' : '');
            }
        }
        const date = new Date(conversation.id || Date.now());
        return `对话 ${date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }

    function switchConversation(index) {
        // ... (代码同前)
         if (index < 0 || index >= conversations.length) {
            console.error("尝试切换到无效的对话索引:", index);
             if (conversations.length > 0) { index = 0; } else { newChatBtn.click(); return; }
        }
        activeConversationIndex = index;
        renderConversationsList();
        renderMessages(conversations[index].messages);
        if (chatMode.value.includes('Id')) {
            console.log("切换到对话", index, "当前会话ID输入框值为:", conversationId.value);
        }
    }

    function renderMessages(messages) {
       // ... (代码同前)
        chatMessages.innerHTML = '';
        if (!messages || messages.length === 0) {
            const systemMessage = createMessageElement({ role: 'system', content: '欢迎使用文木亘聊天助手。请选择聊天模式并发送消息开始对话。' });
            chatMessages.appendChild(systemMessage);
            return;
        }
        messages.forEach(message => {
            const messageElement = createMessageElement(message);
            chatMessages.appendChild(messageElement);
        });
        // 初始渲染后滚动到底部 (非节流)
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }


    // --- 格式化消息内容 (基本保持不变，修复模板字符串变量) ---
    function formatMessage(content) {
        if (typeof content !== 'string') return '';
        let escapedContent = content.replace(/&/g, '&amp;')
                                  .replace(/</g, '&lt;')
                                  .replace(/>/g, '&gt;')
                                  .replace(/"/g, '&quot;')
                                  .replace(/'/g, '&#039;');

        escapedContent = escapedContent.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            const escapedCode = code.replace(/&lt;/g, '<').replace(/>/g, '>');
            // *** 修正这里的模板字符串变量 ***
            const langClass = lang ? ` class="language-${lang}"` : '';
            return `<pre><code${langClass}>${escapedCode.trim()}</code></pre>`;
         });

        escapedContent = escapedContent.replace(/`([^`]+)`/g, (match, code) => {
             const escapedCode = code.replace(/&lt;/g, '<').replace(/>/g, '>');
             return `<code>${escapedCode}</code>`;
         });
        escapedContent = escapedContent.replace(/\n/g, '<br>');
        return escapedContent;
    }

    // --- 发送消息 ---
    function sendMessage() {
        const messageText = userInput.value.trim();
        if (!messageText) return;
        userInput.value = '';

        if (activeConversationIndex === null || activeConversationIndex >= conversations.length) {
             if (conversations.length > 0) { activeConversationIndex = conversations.length - 1; } else { newChatBtn.click(); console.log("请在新创建的对话中重新发送消息。"); return; }
        }
        const currentConversation = conversations[activeConversationIndex];

        // 添加用户消息
        const userMessage = { role: 'user', content: messageText };
        currentConversation.messages.push(userMessage);
        const userMessageElement = createMessageElement(userMessage);
        chatMessages.appendChild(userMessageElement);
        scrollToBottom(); // 用户消息后立即滚动
        if (currentConversation.messages.filter(m => m.role === 'user').length === 1) { renderConversationsList(); }

        // 准备AI消息
        const aiMessage = { role: 'ai', content: '' };
        currentConversation.messages.push(aiMessage);
        currentAiMessageElement = createMessageElement(aiMessage);
        chatMessages.appendChild(currentAiMessageElement);
        currentAiMessageContentElement = currentAiMessageElement.querySelector('.message-content');
        scrollToBottom(); // AI占位符后立即滚动

        // 重置流关闭标志
        streamSuccessfullyClosed = false;

        // 根据模式发送请求 (switch case 不变)
        const mode = chatMode.value;
        let endpoint;
        let params = `content=${encodeURIComponent(messageText)}`;
        switch (mode) {
            case 'normal': endpoint = '/deepseek/chat'; break;
            case 'stream': endpoint = '/deepseek/stream'; break;
            case 'memory': endpoint = '/deepseek/chatMemory'; break;
            case 'streamMemory': endpoint = '/deepseek/streamChatMemory'; break;
            case 'memoryId': endpoint = '/deepseek/chatMemoryId'; params += `&id=${conversationId.value}`; break;
            case 'streamMemoryId': endpoint = '/deepseek/streamChatMemoryId'; params += `&id=${conversationId.value}`; break;
            case 'streamMemoryIdSql': endpoint = '/deepseek/streamChatMemoryIdSql'; params += `&id=${conversationId.value}`; break;
            default:
                console.error("未知的聊天模式:", mode);
                aiMessage.content = "错误：未知的聊天模式。";
                if (currentAiMessageContentElement) { currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content); }
                saveConversations();
                return;
        }

        // 处理流式或非流式响应
        if (mode.includes('stream')) {
            if (currentEventSource) { currentEventSource.close(); } // 关闭旧连接

            console.log(`Starting SSE connection to: ${endpoint}?${params}`); // 调试URL
            currentEventSource = new EventSource(`${endpoint}?${params}`);

            currentEventSource.onopen = function() { console.log("SSE 连接已建立。"); };

            currentEventSource.onmessage = function(event) {
                console.log('SSE data received:', event.data); // 调试数据
                if (event.data === "[DONE]") { // 检查结束符
                    console.log("收到 [DONE] 信号，正常关闭流。");
                    streamSuccessfullyClosed = true; // 标记成功
                    if (currentEventSource) { currentEventSource.close(); currentEventSource = null; }
                    saveConversations();
                    return;
                }

                aiMessage.content += event.data;
                // console.log('AI message content updated:', aiMessage.content); // 调试内容

                if (currentAiMessageContentElement) {
                    // console.log('Updating innerHTML for element:', currentAiMessageContentElement); // 调试元素
                    currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                    // console.log('innerHTML updated.');
                } else {
                    console.warn('currentAiMessageContentElement is null or invalid during onmessage!');
                }
                // *** 使用节流滚动 ***
                throttledScrollToBottom();
            };

            // *** 使用改进后的 onerror ***
            currentEventSource.onerror = function(error) {
                console.error('EventSource 错误:', error); // 打印原始错误

                const wasClosedSuccessfully = streamSuccessfullyClosed;
                streamSuccessfullyClosed = true; // 标记流已尝试关闭

                if (!wasClosedSuccessfully && (!aiMessage.content || aiMessage.content.length < 10)) {
                    let errorMessage = '\n\n抱歉，连接初始阶段出现问题。请重试。';
                     if (currentEventSource && currentEventSource.readyState === EventSource.CONNECTING) {
                         errorMessage = '\n\n抱歉，无法连接到服务器。请检查网络或稍后重试。';
                     } else if (currentEventSource && currentEventSource.readyState === EventSource.CLOSED) {
                         errorMessage = '\n\n抱歉，连接意外关闭。请重试。'; // 更具体的提示
                     }

                    if (currentAiMessageContentElement && !aiMessage.content.includes('抱歉')) {
                        console.log("显示错误信息:", errorMessage); // 调试
                        aiMessage.content += errorMessage;
                        currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                        throttledScrollToBottom(); // 出错时也尝试滚动到底部
                    } else if (!currentAiMessageContentElement) {
                         console.warn('currentAiMessageContentElement is null during onerror!');
                    }
                } else if (!wasClosedSuccessfully) {
                    console.log("捕获到onerror事件，但已有AI响应内容，可能只是正常关闭，不显示额外错误信息。");
                } else {
                     console.log("捕获到onerror事件，但流已被标记为成功关闭，忽略。");
                 }

                if (currentEventSource) {
                    console.log("Closing event source due to error or finalization."); // 调试
                    currentEventSource.close();
                    currentEventSource = null;
                }
                saveConversations(); // 确保保存状态
            };

            currentEventSource.addEventListener('close', () => {
                 console.log("EventSource 'close' event received.");
                 if (currentEventSource) { // 如果是正常关闭（非onerror/onmessage[DONE]触发）
                     console.log("由 'close' 事件正常关闭流。");
                     streamSuccessfullyClosed = true; // 标记成功
                     currentEventSource.close();
                     currentEventSource = null;
                     saveConversations();
                     console.log("对话已保存 (来自 close 事件)。");
                 }
            });

        } else { // 非流式响应 (基本不变)
            fetch(`${endpoint}?${params}`)
                .then(response => { /* ... */ })
                .then(data => { /* ... */ })
                .catch(error => { /* ... */ })
                .finally(() => { /* ... */ });
        }
    }

}); // DOMContentLoaded结束
