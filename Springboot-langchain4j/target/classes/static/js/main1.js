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

    // 初始化
    init();

    // 监听聊天模式变化
    chatMode.addEventListener('change', function() {
        const mode = chatMode.value;
        if (mode.includes('Id')) {
            conversationIdContainer.classList.remove('hidden');
        } else {
            conversationIdContainer.classList.add('hidden');
        }
    });

    // 发送消息按钮点击事件
    sendBtn.addEventListener('click', sendMessage);

    // 按下Enter键发送消息（按Shift+Enter换行）
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 新建对话按钮点击事件
    newChatBtn.addEventListener('click', function() {
        // 关闭之前的连接
        if (currentEventSource) {
            currentEventSource.close();
            currentEventSource = null;
        }

        const newConversation = {
            id: Date.now(),
            messages: []
        };

        conversations.push(newConversation);
        saveConversations();
        renderConversationsList();

        // 切换到新对话
        switchConversation(conversations.length - 1);
    });

    // 初始化函数
    function init() {
        // 从本地存储加载对话历史
        loadConversations();
        renderConversationsList();

        // 如果有对话历史，显示第一个对话
        if (conversations.length > 0) {
            switchConversation(0);
        }
    }

    // 加载对话历史
    function loadConversations() {
        const savedConversations = localStorage.getItem('conversations');
        if (savedConversations) {
            conversations = JSON.parse(savedConversations);
        } else {
            conversations = [{
                id: Date.now(),
                messages: []
            }];
            saveConversations();
        }
    }

    // 保存对话历史到本地存储
    function saveConversations() {
        localStorage.setItem('conversations', JSON.stringify(conversations));
    }

    // 渲染对话列表
    function renderConversationsList() {
        conversationsList.innerHTML = '';

        conversations.forEach((conversation, index) => {
            const li = document.createElement('li');
            const conversationName = getConversationName(conversation);
            li.textContent = conversationName;

            if (index === activeConversationIndex) {
                li.classList.add('active');
            }

            li.addEventListener('click', function() {
                // 关闭之前的连接
                if (currentEventSource) {
                    currentEventSource.close();
                    currentEventSource = null;
                }
                switchConversation(index);
            });

            conversationsList.appendChild(li);
        });
    }

    // 获取对话名称
    function getConversationName(conversation) {
        if (conversation.messages.length > 0) {
            // 使用第一条用户消息作为对话名称
            const firstUserMessage = conversation.messages.find(msg => msg.role === 'user');
            if (firstUserMessage) {
                const name = firstUserMessage.content.slice(0, 20);
                return name + (name.length < firstUserMessage.content.length ? '...' : '');
            }
        }
        return `对话 ${new Date(conversation.id).toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    }

    // 切换对话
    function switchConversation(index) {
        activeConversationIndex = index;
        renderConversationsList();
        renderMessages(conversations[index].messages);
    }

    // 渲染消息
    function renderMessages(messages) {
        chatMessages.innerHTML = '';

        if (messages.length === 0) {
            // 如果没有消息，显示欢迎消息
            const systemMessage = document.createElement('div');
            systemMessage.className = 'message system';
            systemMessage.innerHTML = `
                <div class="message-content">
                    <p>欢迎使用 DeepSeek AI 聊天助手。请选择聊天模式并发送消息开始对话。</p>
                </div>
            `;
            chatMessages.appendChild(systemMessage);
            return;
        }

        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.role}`;

            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';

            // 处理消息内容，支持简单的markdown格式
            const formattedContent = formatMessage(message.content);
            messageContent.innerHTML = formattedContent;

            messageElement.appendChild(messageContent);
            chatMessages.appendChild(messageElement);
        });

        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // 格式化消息内容（简单支持markdown）
    function formatMessage(content) {
        // 处理代码块
        content = content.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // 处理行内代码
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 处理换行
        content = content.replace(/\n/g, '<br>');

        return content;
    }

    // 发送消息
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // 清空输入框
        userInput.value = '';

        // 添加用户消息到聊天窗口
        const userMessage = {
            role: 'user',
            content: message
        };

        if (activeConversationIndex === null) {
            // 如果没有活动对话，创建一个新对话
            newChatBtn.click();
            return;
        }

        conversations[activeConversationIndex].messages.push(userMessage);
        saveConversations();
        renderMessages(conversations[activeConversationIndex].messages);

        // 根据选择的模式发送请求
        const mode = chatMode.value;
        let endpoint;
        let params = `content=${encodeURIComponent(message)}`;

        // 根据聊天模式选择不同的API端点
        switch (mode) {
            case 'normal':
                endpoint = '/deepseek/chat';
                break;
            case 'stream':
                endpoint = '/deepseek/stream';
                break;
            case 'memory':
                endpoint = '/deepseek/chatMemory';
                break;
            case 'streamMemory':
                endpoint = '/deepseek/streamChatMemory';
                break;
            case 'memoryId':
                endpoint = '/deepseek/chatMemoryId';
                params += `&id=${conversationId.value}`;
                break;
            case 'streamMemoryId':
                endpoint = '/deepseek/streamChatMemoryId';
                params += `&id=${conversationId.value}`;
                break;
            case 'streamMemoryIdSql':
                endpoint = '/deepseek/streamChatMemoryIdSql';
                params += `&id=${conversationId.value}`;
                break;
        }

        // 添加AI响应消息占位符
        const aiMessage = {
            role: 'ai',
            content: ''
        };
        conversations[activeConversationIndex].messages.push(aiMessage);
        renderMessages(conversations[activeConversationIndex].messages);

        // 根据是否是流式响应选择不同的请求方式
        if (mode.includes('stream')) {
            // 关闭之前的连接
            if (currentEventSource) {
                currentEventSource.close();
            }

            // 流式响应
            currentEventSource = new EventSource(`${endpoint}?${params}`);

            currentEventSource.onmessage = function(event) {
                if (event.data === "[DONE]") {
                    currentEventSource.close();
                    currentEventSource = null;
                    saveConversations();
                } else {
                    // 更新AI响应
                    aiMessage.content += event.data;
                    renderMessages(conversations[activeConversationIndex].messages);
                }
            };

            currentEventSource.onerror = function(error) {
                console.error('EventSource error:', error);
                if (currentEventSource) {
                    currentEventSource.close();
                    currentEventSource = null;
                }

                // 显示错误信息
                if (!aiMessage.content.includes('抱歉')) {
                    aiMessage.content += '\n\n抱歉，连接出现问题。请重试。';
                    renderMessages(conversations[activeConversationIndex].messages);
                    saveConversations();
                }
            };
        } else {
            // 非流式响应
            fetch(`${endpoint}?${params}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.text();
                })
                .then(data => {
                    aiMessage.content = data;
                    renderMessages(conversations[activeConversationIndex].messages);
                    saveConversations();
                })
                .catch(error => {
                    console.error('Error:', error);
                    aiMessage.content = '抱歉，出现了错误。请重试。';
                    renderMessages(conversations[activeConversationIndex].messages);
                    saveConversations();
                });
        }
    }
});
