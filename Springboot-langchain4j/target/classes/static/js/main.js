// ========================================================================
// 前端 main.js 完整代码 (v3)
// - 修复页面刷新：按钮 type="button" (HTML) + preventDefault() (JS)
// - 包含 onmessage 过滤特定错误文本 (临时措施)
// - 包含 onmessage 处理 [DONE] 信号 (需要后端配合)
// - 包含 onerror 禁用用户错误提示，仅记录日志和清理
// ========================================================================
document.addEventListener('DOMContentLoaded', function() {
    // --- Get DOM Elements ---
    const chatMode = document.getElementById('chatMode');
    const conversationIdContainer = document.getElementById('conversationIdContainer');
    const conversationIdInput = document.getElementById('conversationIdInput'); // Matches HTML ID
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const newChatBtn = document.getElementById('newChat');
    const conversationsList = document.getElementById('conversationsList');

    // --- State Variables ---
    let conversations = [];
    let activeConversationIndex = null;
    let currentEventSource = null;
    let currentAiMessageElement = null;
    let currentAiMessageContentElement = null;
    let streamSuccessfullyClosed = false;

    // --- Utility Functions ---
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

    function scrollToBottom() {
        requestAnimationFrame(() => {
             chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
        });
    }
    const throttledScrollToBottom = throttle(scrollToBottom, 150);

    // --- Initialization ---
    function init() {
        loadConversations();
        updateAppNameInUI(); // Update welcome message if needed
        if (conversations.length > 0) {
            switchConversation(0);
        } else {
            newChatBtn.click(); // Create a new chat if none exist
        }
        chatMode.dispatchEvent(new Event('change')); // Ensure initial UI state for chatMode is correct
    }

    // --- Event Listeners ---
    chatMode.addEventListener('change', function() {
        const mode = chatMode.value;
        conversationIdContainer.classList.toggle('hidden', !mode.includes('Id')); // Show/hide ID input

        if (currentEventSource) {
            console.log("Chat mode changed, closing current stream.");
            streamSuccessfullyClosed = false;
            currentEventSource.close();
            currentEventSource = null;
            addInterruptedMessage("模式切换"); // Add note to the AI message
            currentAiMessageElement = null;
            currentAiMessageContentElement = null;
            saveConversations();
        }
    });

    // --- FIX FOR PAGE REFRESH: Prevent default button action ---
    sendBtn.addEventListener('click', function(event) {
        event.preventDefault(); // <<< PREVENT DEFAULT SUBMIT/REFRESH
        sendMessage();
    });

    // --- FIX FOR PAGE REFRESH: Prevent default Enter key action (if inside a form) ---
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // <<< PREVENT DEFAULT SUBMIT/REFRESH
            sendMessage();
        }
    });

    newChatBtn.addEventListener('click', function(event) {
        event.preventDefault(); // Good practice for buttons
        if (currentEventSource) {
            console.log("New chat requested, closing current stream.");
            streamSuccessfullyClosed = false;
            currentEventSource.close();
            currentEventSource = null;
            addInterruptedMessage("新建会话");
        }
        currentAiMessageElement = null;
        currentAiMessageContentElement = null;

        const newConversation = { id: Date.now(), messages: [] };
        conversations.push(newConversation);
        saveConversations();
        switchConversation(conversations.length - 1);
    });

    // --- Helper: Add Interrupted Message ---
    function addInterruptedMessage(reason) {
        if (currentAiMessageContentElement && !currentAiMessageContentElement.textContent.includes("已中止")) {
             const activeConv = conversations[activeConversationIndex];
             if (activeConv && activeConv.messages.length > 0) {
                 const lastMessage = activeConv.messages[activeConv.messages.length - 1];
                 if (lastMessage.role === 'ai' && !lastMessage.content.includes("已中止")) {
                     lastMessage.content += `\n\n(${reason}，流已中止)`;
                     currentAiMessageContentElement.innerHTML = formatMessage(lastMessage.content);
                 }
             }
        }
    }


    // --- Message Creation ---
    function createMessageElement(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role}`;
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = formatMessage(message.content || (message.role === 'ai' ? '...' : '(空)'));
        messageElement.appendChild(messageContent);
        return messageElement;
    }

    // --- Conversation Management ---
    function loadConversations() {
        const saved = localStorage.getItem('conversations');
        try {
            conversations = saved ? JSON.parse(saved) : [];
            if (!Array.isArray(conversations)) conversations = [];
            conversations = conversations.filter(c => c && typeof c === 'object' && Array.isArray(c.messages));
        } catch (e) {
            console.error("Failed to parse conversations:", e);
            conversations = [];
            localStorage.removeItem('conversations');
        }
    }

    function saveConversations() {
        const validConversations = conversations.filter(c => c && typeof c === 'object' && Array.isArray(c.messages));
        try {
            localStorage.setItem('conversations', JSON.stringify(validConversations));
        } catch (e) {
            console.error("Failed to save conversations:", e);
        }
    }

    function renderConversationsList() {
        conversationsList.innerHTML = '';
        conversations.forEach((conversation, index) => {
            if (!conversation || typeof conversation !== 'object') return;
            const li = document.createElement('li');
            li.textContent = getConversationName(conversation);
            li.dataset.index = index;
            if (index === activeConversationIndex) li.classList.add('active');

            li.addEventListener('click', function(event) {
                event.preventDefault();
                const indexToSwitch = parseInt(this.dataset.index, 10);
                if (currentEventSource) {
                    console.log("Switching conversation, closing current stream.");
                    streamSuccessfullyClosed = false;
                    currentEventSource.close();
                    currentEventSource = null;
                    addInterruptedMessage("切换会话");
                }
                currentAiMessageElement = null;
                currentAiMessageContentElement = null;
                switchConversation(indexToSwitch);
            });
            conversationsList.appendChild(li);
        });
    }

    function getConversationName(conversation) {
        if (!conversation || !Array.isArray(conversation.messages)) return `Invalid ${conversation?.id || '?'}`;
        const firstUserMsg = conversation.messages.find(m => m?.role === 'user' && m.content?.trim());
        if (firstUserMsg) {
            const name = firstUserMsg.content.trim().slice(0, 20).replace(/\n/g, ' ');
            return name + (name.length < firstUserMsg.content.trim().length ? '...' : '');
        }
        const date = new Date(conversation.id || Date.now());
        return `对话 ${date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
    }

    function switchConversation(index) {
        if (index < 0 || index >= conversations.length) {
            index = conversations.length > 0 ? 0 : -1;
            if (index === -1) {
                 newChatBtn.click(); return;
             }
        }
        activeConversationIndex = index;
        renderConversationsList();
        renderMessages(conversations[index].messages);
        if (chatMode.value.includes('Id')) {
            const currentConvId = conversations[index]?.id || (index + 1); // Use timestamp ID or index+1
            conversationIdInput.value = currentConvId;
             console.log("Switched to conversation", index, "using ID:", conversationIdInput.value);
        }
    }

    function renderMessages(messages) {
        chatMessages.innerHTML = '';
        if (!messages || messages.length === 0) {
            const appName = document.querySelector('header h1 span')?.textContent || 'AI';
            const welcomeText = `欢迎使用 ${appName} 聊天助手。请在下方输入消息开始对话。`;
            chatMessages.appendChild(createMessageElement({ role: 'system', content: welcomeText }));
            return;
        }
        messages.forEach(message => {
            if (message && typeof message === 'object') {
                chatMessages.appendChild(createMessageElement(message));
            } else {
                console.warn("Skipping invalid message object:", message);
            }
        });
        setTimeout(scrollToBottom, 50); // Scroll after render
    }

    // --- Message Formatting (Markdown to HTML) ---
    function formatMessage(content) {
        if (typeof content !== 'string') return '';
        let escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        // Code blocks (```lang ... ```)
        escaped = escaped.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            const unescapedCode = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>'); // Be careful with unescaping if code is untrusted
            const langClass = lang ? ` class="language-${lang}"` : '';
            return `<pre><code${langClass}>${unescapedCode.trim()}</code></pre>`;
        });
        // Inline code (`code`)
        escaped = escaped.replace(/`([^`]+)`/g, (match, code) => `<code>${code.replace(/&lt;/g, '<').replace(/&gt;/g, '>')}</code>`);
        // Newlines
        escaped = escaped.replace(/\n/g, '<br>');
        // Bold, Italic (Optional)
        // escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return escaped;
    }

    // --- Send Message Logic ---
    function sendMessage() {
        const messageText = userInput.value.trim();
        if (!messageText) return;
        userInput.value = '';
        userInput.focus();

        if (activeConversationIndex === null || activeConversationIndex >= conversations.length) {
             console.warn("No active conversation, attempting recovery...");
             if (conversations.length > 0) activeConversationIndex = 0; else { newChatBtn.click(); return; }
        }
        const currentConversation = conversations[activeConversationIndex];

        // Add user message
        const userMessage = { role: 'user', content: messageText };
        currentConversation.messages.push(userMessage);
        chatMessages.appendChild(createMessageElement(userMessage));
        scrollToBottom();
        if (currentConversation.messages.filter(m => m.role === 'user').length === 1) {
            renderConversationsList(); // Update title on first user message
        }

        // Prepare AI message placeholder
        const aiMessage = { role: 'ai', content: '' }; // Start empty, maybe show '...' via CSS
        currentConversation.messages.push(aiMessage);
        currentAiMessageElement = createMessageElement(aiMessage);
        chatMessages.appendChild(currentAiMessageElement);
        currentAiMessageContentElement = currentAiMessageElement.querySelector('.message-content');
        scrollToBottom();

        // Reset stream flag
        streamSuccessfullyClosed = false;

        // Prepare request
        const mode = chatMode.value;
        const basePath = '/deepseek';
        let endpoint;
        let params = new URLSearchParams();
        params.append('content', messageText);

        // Determine endpoint and add ID if needed
        switch (mode) {
            case 'normal': endpoint = `${basePath}/chat`; break;
            case 'stream': endpoint = `${basePath}/stream`; break;
            case 'memory': endpoint = `${basePath}/chatMemory`; break;
            case 'streamMemory': endpoint = `${basePath}/streamChatMemory`; break;
            case 'memoryId': endpoint = `${basePath}/chatMemoryId`; params.append('id', conversationIdInput.value); break;
            case 'streamMemoryId': endpoint = `${basePath}/streamChatMemoryId`; params.append('id', conversationIdInput.value); break;
            case 'streamMemoryIdSql': endpoint = `${basePath}/streamChatMemoryIdSql`; params.append('id', conversationIdInput.value); break;
            default:
                console.error("Unknown chat mode:", mode);
                aiMessage.content = "错误：未知的聊天模式。";
                if (currentAiMessageContentElement) currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                saveConversations();
                currentAiMessageElement = null; currentAiMessageContentElement = null;
                return;
        }
        const fullUrl = `${endpoint}?${params.toString()}`;
        console.log("Requesting:", fullUrl);

        // --- Handle Streaming (EventSource) ---
        if (mode.includes('stream')) {
            if (currentEventSource) { currentEventSource.close(); } // Close previous if any

            currentEventSource = new EventSource(fullUrl);

            currentEventSource.onopen = function() {
                console.log("SSE connection opened.");
                scrollToBottom();
            };

            currentEventSource.onmessage = function(event) {
                // ****** ATTENTION: Ensure this string EXACTLY matches what the server sends ******
                // You might need to copy it from the browser's Network tab (EventStream response)
                const errorTextToFilter = "抱歉，连接出现问题。请重试。";
                const doneSignal = "[DONE]"; // Signal from backend (needs backend change)

                // console.log('[RAW SSE DATA]', event.data); // Uncomment for debugging

                // 1. Check for DONE signal (requires backend change)
                if (event.data === doneSignal) {
                    console.log(`Received '${doneSignal}', stream finished successfully.`);
                    streamSuccessfullyClosed = true;
                    if (currentEventSource) { currentEventSource.close(); currentEventSource = null; }
                    saveConversations();
                    scrollToBottom();
                    currentAiMessageElement = null; currentAiMessageContentElement = null;
                    return;
                }

                // 2. Filter specific unwanted text (Temporary fix)
                if (event.data === errorTextToFilter) {
                    console.warn(`[FILTER] Ignored specific text: "${errorTextToFilter}"`);
                    // Even though we ignore it, the stream might end here uncleanly if it's the last message
                    // Ideally, the backend shouldn't send this as data.
                    // We don't close the connection here, maybe more data or [DONE] will come.
                    return;
                }

                // 3. Process normal data
                if (aiMessage && currentAiMessageContentElement) {
                    aiMessage.content += event.data;
                    currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                    throttledScrollToBottom();
                } else {
                    console.warn('AI message element not ready, ignoring data:', event.data);
                }
            };

            currentEventSource.onerror = function(error) {
                console.error('EventSource error:', error);
                console.warn('onerror triggered. Not showing error to user, performing cleanup.');

                if (!streamSuccessfullyClosed && currentAiMessageContentElement) {
                    if (!aiMessage.content.includes("(连接出错)")) {
                        aiMessage.content += "";
                        currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                    }
                }

                streamSuccessfullyClosed = false; // Error means not successfully closed
                if (currentEventSource) { currentEventSource.close(); currentEventSource = null; }
                saveConversations(); // Save state even on error
                scrollToBottom();
                currentAiMessageElement = null; currentAiMessageContentElement = null;
            };

             currentEventSource.addEventListener('close', () => {
                 console.log("EventSource 'close' event.");
                 // Cleanup might have already happened in onerror or onmessage([DONE])
                 if (currentEventSource) {
                     console.log("Performing cleanup in 'close' event.");
                     currentEventSource.close();
                     currentEventSource = null;
                 }
                 // Reset refs just in case
                 currentAiMessageElement = null; currentAiMessageContentElement = null;
             });

        }
        // --- Handle Non-Streaming (Fetch) ---
        else {
            fetch(fullUrl)
                .then(response => {
                    if (!response.ok) {
                         return response.text().then(text => { throw new Error(`HTTP ${response.status}: ${text || 'Server error'}`); });
                    }
                    return response.text();
                })
                .then(data => {
                    aiMessage.content = data;
                    if (currentAiMessageContentElement) currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                    streamSuccessfullyClosed = true; // Mark non-stream as successful on completion
                    saveConversations();
                    scrollToBottom();
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                    aiMessage.content = `请求失败: ${error.message}`;
                     if (currentAiMessageContentElement) currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                     streamSuccessfullyClosed = false;
                    saveConversations();
                    scrollToBottom();
                })
                .finally(() => {
                    currentAiMessageElement = null;
                    currentAiMessageContentElement = null;
                });
        }
    }

    // --- UI Helpers ---
    function updateAppNameInUI() {
        const h1 = document.querySelector('header h1');
        let appName = 'AI';
        if (h1) {
            const span = h1.querySelector('span'); // Assuming name is in a span next to the icon
             if(span) appName = span.textContent.replace(/聊天助手/,'').trim() || appName;
             else appName = h1.textContent.replace(/聊天助手/,'').trim() || appName; // Fallback if no span
        }
        console.log("App Name:", appName);
        const welcome = chatMessages.querySelector('.message.system .message-content p');
        if (welcome && welcome.textContent.includes('欢迎使用')) {
            welcome.textContent = `欢迎使用 ${appName} 聊天助手。请在下方输入消息开始对话。`;
        }
    }

    // --- Start the application ---
    init();

}); // End DOMContentLoaded
