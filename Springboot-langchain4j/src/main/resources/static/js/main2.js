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
        // 如果在流式传输时更改模式，则中止流
        if (currentEventSource) {
            console.log("聊天模式改变，关闭当前流。");
            currentEventSource.close();
            currentEventSource = null;
            // 可选：更新最后一条AI消息的状态或添加系统提示
            if (currentAiMessageContentElement && !currentAiMessageContentElement.textContent.includes("已中止")) {
                currentAiMessageContentElement.innerHTML += formatMessage("\n\n(流已中止)");
            }
            saveConversations(); // 保存当前状态
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
        currentAiMessageElement = null; // 重置跟踪的元素
        currentAiMessageContentElement = null;

        const newConversation = {
            id: Date.now(),
            messages: []
        };

        conversations.push(newConversation);
        saveConversations(); // 创建后立即保存
        // switchConversation 会调用 renderConversationsList
        switchConversation(conversations.length - 1); // 切换到新对话
    });

    // --- 辅助函数：创建消息DOM元素 ---
    function createMessageElement(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role}`;

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        // 格式化内容（处理初始空内容）
        messageContent.innerHTML = formatMessage(message.content || '');

        messageElement.appendChild(messageContent);
        return messageElement;
    }

    // --- 辅助函数：滚动到底部 ---
    function scrollToBottom() {
        // 使用平滑滚动效果更好
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
        // 或者立即滚动： chatMessages.scrollTop = chatMessages.scrollHeight;
    }


    // 初始化函数
    function init() {
        loadConversations();
        if (conversations.length > 0) {
            switchConversation(0); // 加载第一个对话
        } else {
            newChatBtn.click(); // 如果没有历史记录，则创建一个新对话
        }
         // 根据默认模式触发一次模式检查，以显示/隐藏会话ID输入框
         chatMode.dispatchEvent(new Event('change'));
    }

    // 加载对话历史
    function loadConversations() {
        const savedConversations = localStorage.getItem('conversations');
        try {
            if (savedConversations) {
                conversations = JSON.parse(savedConversations);
                if (!Array.isArray(conversations)) {
                    console.warn("本地存储中的对话数据格式无效，已重置。");
                    conversations = [];
                }
                // 清理可能存在的空对话数组（可选）
                conversations = conversations.filter(conv => conv && typeof conv === 'object');
            } else {
                conversations = [];
            }
        } catch (e) {
            console.error("从本地存储解析对话失败:", e);
            conversations = [];
        }
        // init函数会确保至少有一个对话存在
    }

    // 保存对话历史到本地存储
    function saveConversations() {
        // 过滤掉完全没有消息的对话（可选，避免保存空对话）
        // const validConversations = conversations.filter(conv => conv.messages.length > 0);
        // localStorage.setItem('conversations', JSON.stringify(validConversations));
        localStorage.setItem('conversations', JSON.stringify(conversations));
    }

    // 渲染对话列表
    function renderConversationsList() {
        conversationsList.innerHTML = '';
        conversations.forEach((conversation, index) => {
            const li = document.createElement('li');
            // 确保 conversation 对象有效
             if (!conversation || typeof conversation !== 'object') {
                 console.warn(`跳过无效的对话数据，索引: ${index}`);
                 return; // 跳过无效的条目
             }
            const conversationName = getConversationName(conversation);
            li.textContent = conversationName;
            li.dataset.index = index; // 存储索引方便点击

            if (index === activeConversationIndex) {
                li.classList.add('active');
            }

            li.addEventListener('click', function() {
                 const indexToSwitch = parseInt(this.dataset.index, 10);
                 // 关闭之前的连接
                 if (currentEventSource) {
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

    // 获取对话名称
    function getConversationName(conversation) {
         // 添加健壮性检查
        if (!conversation || !Array.isArray(conversation.messages)) {
             return `无效对话 ${conversation ? conversation.id : '未知'}`;
         }
        if (conversation.messages.length > 0) {
            const firstUserMessage = conversation.messages.find(msg => msg.role === 'user' && msg.content);
            if (firstUserMessage) {
                const name = firstUserMessage.content.slice(0, 20).replace(/\n/g, ' '); // 替换换行符
                return name + (name.length < firstUserMessage.content.length ? '...' : '');
            }
        }
         // 如果没有用户消息或内容为空，则使用时间戳
        const date = new Date(conversation.id || Date.now()); // 如果id无效则用当前时间
        return `对话 ${date.toLocaleString('zh-CN', {
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    }

    // 切换对话
    function switchConversation(index) {
        if (index < 0 || index >= conversations.length) {
            console.error("尝试切换到无效的对话索引:", index);
             if (conversations.length > 0) {
                index = 0; // 切换到第一个
             } else {
                newChatBtn.click(); // 创建新的
                return;
             }
        }
        activeConversationIndex = index;
        renderConversationsList(); // 更新侧边栏高亮
        renderMessages(conversations[index].messages); // 渲染选定对话的消息
         // 切换对话时，也要更新会话ID输入框的值（如果相关模式选中）
        if (chatMode.value.includes('Id')) {
            // 尝试从对话中提取ID，或者使用默认值/新值
            // 这里简化处理，假设切换时用户会手动管理ID输入框，
            // 或者你可以实现更复杂的逻辑，比如将ID存储在conversation对象中
            console.log("切换到对话", index, "当前会话ID输入框值为:", conversationId.value);
        }
    }

    // 渲染指定对话的所有消息 (用于切换对话或页面加载)
    function renderMessages(messages) {
        chatMessages.innerHTML = ''; // 清空现有消息

        if (!messages || messages.length === 0) {
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
            const messageElement = createMessageElement(message);
            chatMessages.appendChild(messageElement);
        });

        scrollToBottom(); // 渲染完后滚动到底部
    }

    // 格式化消息内容（简单支持markdown）
    function formatMessage(content) {
        if (typeof content !== 'string') return ''; // 处理非字符串输入

        // 1. 转义HTML特殊字符 (防止XSS) - 非常重要！
        // A simple way to escape basic HTML:
        let escapedContent = content.replace(/&/g, '&amp;')
                                  .replace(/</g, '&lt;')
                                  .replace(/>/g, '&gt;')
                                  .replace(/"/g, '&quot;')
                                  .replace(/'/g, '&#039;'); // 确保此行无误

        // 2. 处理代码块 (```lang\n code ```)
        // Improved regex to handle optional language and capture content correctly
        escapedContent = escapedContent.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
             // Re-escape < and > inside the code block in case they were intended literally
            const escapedCode = code.replace(/&lt;/g, '<').replace(/>/g, '>');
            const langClass = lang ? ` class="language-${lang}"` : ''; // 修正模板字符串变量名
            return `<pre><code${langClass}>${escapedCode.trim()}</code></pre>`;
         });


        // 3. 处理行内代码 (`code`)
         escapedContent = escapedContent.replace(/`([^`]+)`/g, (match, code) => {
             // Re-escape < and > inside the code block in case they were intended literally
             const escapedCode = code.replace(/&lt;/g, '<').replace(/>/g, '>');
             return `<code>${escapedCode}</code>`;
         });

        // 4. 处理换行 (\n to <br>) - 最后处理
        escapedContent = escapedContent.replace(/\n/g, '<br>');

        return escapedContent;
    }

    // 发送消息 - 核心修改处
    function sendMessage() {
        const messageText = userInput.value.trim();
        if (!messageText) return;

        userInput.value = ''; // 清空输入框

        if (activeConversationIndex === null || activeConversationIndex >= conversations.length) {
             console.error("没有活动的对话或索引无效。");
             // 尝试找到最后一个对话或创建新的
             if (conversations.length > 0) {
                 activeConversationIndex = conversations.length - 1;
             } else {
                 newChatBtn.click(); // 创建新对话
                 // 因为 newChatBtn.click() 是异步的（或者说后续的 switchConversation 是），
                 // 直接在这里发送消息可能在新对话就绪前执行。
                 // 一个简单的处理是延迟发送，或者让 newChatBtn 返回 Promise
                 // 这里暂时返回，让用户在新对话创建后再发送
                 console.log("请在新创建的对话中重新发送消息。");
                 return;
             }
        }

        const currentConversation = conversations[activeConversationIndex];

        // 1. 添加用户消息到数据模型
        const userMessage = { role: 'user', content: messageText };
        currentConversation.messages.push(userMessage);

        // 2. 添加用户消息到DOM
        const userMessageElement = createMessageElement(userMessage);
        chatMessages.appendChild(userMessageElement);
        scrollToBottom();

         // 如果这是此对话的第一条用户消息，更新侧边栏标题
         if (currentConversation.messages.filter(m => m.role === 'user').length === 1) {
             renderConversationsList();
         }


        // 3. 准备AI消息（数据模型 + DOM占位符）
        const aiMessage = { role: 'ai', content: '' };
        currentConversation.messages.push(aiMessage);

        // 创建AI消息的DOM元素并获取内容区域的引用
        currentAiMessageElement = createMessageElement(aiMessage); // 创建空的AI消息元素
        chatMessages.appendChild(currentAiMessageElement);
        currentAiMessageContentElement = currentAiMessageElement.querySelector('.message-content'); // 获取内容div

        scrollToBottom(); // 添加占位符后滚动


        // 4. 根据模式发送请求
        const mode = chatMode.value;
        let endpoint;
        let params = `content=${encodeURIComponent(messageText)}`; // 使用 messageText

        switch (mode) {
            case 'normal': endpoint = '/deepseek/chat'; break;
            case 'stream': endpoint = '/deepseek/stream'; break;
            case 'memory': endpoint = '/deepseek/chatMemory'; break;
            case 'streamMemory': endpoint = '/deepseek/streamChatMemory'; break;
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
            default:
                console.error("未知的聊天模式:", mode);
                aiMessage.content = "错误：未知的聊天模式。";
                if (currentAiMessageContentElement) { // 检查元素是否存在
                    currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                }
                saveConversations();
                return;
        }

        // 5. 处理流式或非流式响应
        if (mode.includes('stream')) {
            // 关闭之前的连接（如果存在）
            if (currentEventSource) {
                currentEventSource.close();
            }

            // 创建新的EventSource连接
            currentEventSource = new EventSource(`${endpoint}?${params}`);

            currentEventSource.onopen = function() {
                console.log("SSE 连接已建立。");
            };

            currentEventSource.onmessage = function(event) {
                // 检查是否是结束信号（如果后端发送特定信号）
                 // 后端 Langchain4j Flux 通常在结束后自动关闭连接，
                 // 但你也可以约定一个特殊的结束消息，比如 "[DONE]"
                if (event.data === "[DONE]") { // 示例：如果后端发送"[DONE]"
                    console.log("收到 [DONE] 信号。");
                    currentEventSource.close(); // 关闭连接
                    currentEventSource = null;
                    saveConversations(); // 保存最终结果
                    // 不需要再更新DOM，因为最后的数据已经处理了
                    return;
                }

                // 更新数据模型中的AI消息内容
                aiMessage.content += event.data;

                // **关键：只更新AI消息占位符的内容**
                if (currentAiMessageContentElement) { // 检查元素是否存在
                    currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                }

                // 滚动到底部以显示新内容
                scrollToBottom();
            };

            currentEventSource.onerror = function(error) {
                console.error('EventSource 错误:', error);
                let errorMessage = '\n\n抱歉，连接出现问题。';
                 // 如果readyState是CONNECTING，可能是网络问题或服务器未启动
                 if (currentEventSource && currentEventSource.readyState === EventSource.CONNECTING) {
                     errorMessage += ' (无法连接到服务器)';
                 } else if (currentEventSource && currentEventSource.readyState === EventSource.CLOSED) {
                     // 如果连接已关闭，可能是正常的结束，也可能是异常关闭
                      console.log("SSE 连接已关闭 (可能由错误引起)。");
                 }


                if (currentEventSource) {
                    currentEventSource.close(); // 关闭可能存在的连接
                    currentEventSource = null;
                }

                // 在界面上显示错误信息（追加到现有内容）
                if (currentAiMessageContentElement && !aiMessage.content.includes('抱歉')) {
                    aiMessage.content += errorMessage; // 更新数据模型
                    currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content); // 更新DOM
                    scrollToBottom();
                }
                saveConversations(); // 保存包含错误信息的状态
            };

             // Langchain4j Flux 在结束后会关闭连接，触发 close 事件
            currentEventSource.addEventListener('close', () => {
                 // 这个事件在正常结束和错误后都可能触发
                 console.log("EventSource 'close' event received.");
                 if (currentEventSource) { // 如果不是被 onerror 或 onmessage([DONE]) 关闭的
                     currentEventSource.close(); // 确保关闭
                     currentEventSource = null;
                     saveConversations(); // 确保保存
                     console.log("对话已保存 (来自 close 事件)。");
                 }
            }); // 确保这里有分号 ;

        } else { // 非流式响应
            fetch(`${endpoint}?${params}`)
                .then(response => {
                    if (!response.ok) {
                        // 尝试读取错误信息体
                         return response.text().then(text => {
                            throw new Error(`HTTP 错误! 状态: ${response.status}, 消息: ${text || '无'}`);
                        });
                    }
                    return response.text();
                })
                .then(data => {
                    aiMessage.content = data; // 更新数据模型
                    if (currentAiMessageContentElement) { // 检查元素是否存在
                       currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content); // 更新DOM占位符
                    }
                    saveConversations(); // 保存结果
                    scrollToBottom(); // 滚动到底部
                })
                .catch(error => {
                    console.error('Fetch错误:', error);
                    const errorText = `抱歉，请求失败：${error.message}`;
                    aiMessage.content = errorText; // 更新数据模型
                     if (currentAiMessageContentElement) { // 检查元素是否存在
                        currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content); // 更新DOM占位符
                     }
                    saveConversations(); // 保存错误状态
                    scrollToBottom(); // 滚动到底部
                })
                .finally(() => {
                    // 清理对当前AI消息元素的跟踪，因为非流式请求已完成
                    currentAiMessageElement = null;
                    currentAiMessageContentElement = null;
                });
        }
    }

}); // DOMContentLoaded结束
