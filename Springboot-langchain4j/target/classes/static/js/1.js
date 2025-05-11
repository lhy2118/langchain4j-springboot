
document.addEventListener('DOMContentLoaded', function() {
    // --- Get DOM Elements ---
    const chatMode = document.getElementById('chatMode');
    const conversationIdContainer = document.getElementById('conversationIdContainer');
    const conversationIdInput = document.getElementById('conversationIdInput');
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
        updateAppNameInUI();
        if (conversations.length > 0) {
            switchConversation(0);
        } else {
            newChatBtn.click();
        }
        chatMode.dispatchEvent(new Event('change'));
        updatePlaceholderText(); // Set initial placeholder
    }

    // --- Event Listeners ---
    chatMode.addEventListener('change', function() {
        const mode = chatMode.value;
        conversationIdContainer.classList.toggle('hidden', !(mode.includes('Id') || mode.includes('Sql'))); // Show ID only for relevant modes

        if (currentEventSource) {
            console.log("Chat mode changed, closing current stream.");
            streamSuccessfullyClosed = false;
            currentEventSource.close();
            currentEventSource = null;
            addInterruptedMessage("模式切换");
            currentAiMessageElement = null;
            currentAiMessageContentElement = null;
            saveConversations();
        }
        updatePlaceholderText(); // Update placeholder on mode change
    });

    sendBtn.addEventListener('click', function(event) {
        event.preventDefault();
        sendMessage();
    });

    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    newChatBtn.addEventListener('click', function(event) {
        event.preventDefault();
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
                 // Only add interrupted message if the last message was an AI one and not already marked
                 if (lastMessage.role === 'ai' && !lastMessage.content?.includes("已中止") && !lastMessage.content?.includes('<img')) { // Avoid adding to images
                     lastMessage.content = (lastMessage.content || '') + `\n\n(${reason}，流已中止)`;
                     currentAiMessageContentElement.innerHTML = formatMessage(lastMessage.content);
                 }
             }
        }
    }

    // --- Helper: Update Placeholder Text ---
    function updatePlaceholderText() {
        const mode = chatMode.value;
        if (mode === 'imageChat') {
            userInput.placeholder = "输入图像生成提示...";
        } else {
            userInput.placeholder = "指令输入...";
        }
    }

    // --- Message Creation ---
    function createMessageElement(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role}`;
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        // Check if it's an AI message and content looks like a potential image URL
        const isPotentialImageUrl = message.role === 'ai' &&
                                  typeof message.content === 'string' &&
                                  message.content.startsWith('http') &&
                                  /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(message.content.split('?')[0]); // Check extension before query params


        if (isPotentialImageUrl) {
             // Render as image + link
             const imgElement = document.createElement('img');
             imgElement.src = message.content;
             imgElement.alt = "Generated Image";
             imgElement.style.maxWidth = '100%';
             imgElement.style.maxHeight = '400px'; // Limit display height
             imgElement.style.display = 'block';
             imgElement.style.borderRadius = '8px'; // Optional styling
             imgElement.style.marginTop = '10px';
             imgElement.onerror = () => { // Handle broken image links
                messageContent.innerHTML = formatMessage(`图片加载失败: ${message.content}`);
             }
             messageContent.appendChild(imgElement);

             const linkElement = document.createElement('a');
             linkElement.href = message.content;
             linkElement.textContent = "查看原图";
             linkElement.target = "_blank"; // Open in new tab
             linkElement.rel = "noopener noreferrer";
             linkElement.style.display = 'block';
             linkElement.style.marginTop = '8px';
             linkElement.style.fontSize = '0.9em';
             linkElement.style.color = 'var(--primary-color)'; // Style link
             messageContent.appendChild(linkElement);
        } else {
            // Otherwise, format as text (handle potential empty content)
             messageContent.innerHTML = formatMessage(message.content || (message.role === 'ai' ? '...' : '(空)'));
        }

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
            // Add check for large data - consider limiting history or using IndexedDB for larger storage
             const dataString = JSON.stringify(validConversations);
             if (dataString.length > 4 * 1024 * 1024) { // Approx 4MB limit check
                console.warn("Conversation data getting large, consider clearing old history.");
             }
            localStorage.setItem('conversations', dataString);
        } catch (e) {
            console.error("Failed to save conversations (maybe storage limit exceeded?):", e);
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
            // Check if the first AI response was an image
            const firstAiMsg = conversation.messages.find(m => m?.role === 'ai');
            if (firstAiMsg && typeof firstAiMsg.content === 'string' && firstAiMsg.content.startsWith('http') && /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(firstAiMsg.content.split('?')[0])) {
                 return `图像: ${firstUserMsg.content.trim().slice(0, 15)}...`;
            }
            // Otherwise, use text content
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
        if (chatMode.value.includes('Id') || chatMode.value.includes('Sql')) {
            // Use the conversation's timestamp ID if available, otherwise default/increment
            const currentConvId = conversations[index]?.id || (index + 1);
            conversationIdInput.value = currentConvId;
            console.log("Switched to conversation", index, "using ID:", conversationIdInput.value);
        } else {
             conversationIdInput.value = '1'; // Reset to default if not ID mode
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
        // Basic escaping first
        let escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        // Code blocks (```lang ... ```) - Ensure it handles escaped < > correctly if needed inside code
        escaped = escaped.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
            // Selectively unescape common HTML entities that might be inside code blocks
            const unescapedCode = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
            const langClass = lang ? ` class="language-${lang}"` : '';
            // Escape again after potential unescaping to prevent XSS if code is complex/untrusted
            const finalCode = unescapedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre><code${langClass}>${finalCode.trim()}</code></pre>`;
        });
        // Inline code (`code`)
        escaped = escaped.replace(/`([^`]+)`/g, (match, code) => `<code>${code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')}</code>`);
        // Bold (**text**)
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic (*text*)
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Newlines
        escaped = escaped.replace(/\n/g, '<br>');
        return escaped;
    }

    // --- Send Message Logic ---
    function sendMessage() {
        const messageText = userInput.value.trim();
        if (!messageText) return;
        userInput.value = '';
        userInput.focus();

        if (activeConversationIndex === null || activeConversationIndex >= conversations.length) {
             console.warn("No active conversation, creating or selecting first.");
             if (conversations.length === 0) { newChatBtn.click(); return; }
             activeConversationIndex = 0; // Select first if exists
        }
        const currentConversation = conversations[activeConversationIndex];

        // Add user message
        const userMessage = { role: 'user', content: messageText };
        currentConversation.messages.push(userMessage);
        chatMessages.appendChild(createMessageElement(userMessage));
        scrollToBottom();
        // Update conversation list name if it's the first user message
        if (currentConversation.messages.filter(m => m.role === 'user').length === 1) {
            renderConversationsList();
        }

        // Prepare AI message placeholder
        const aiMessage = { role: 'ai', content: '' }; // Start empty
        currentConversation.messages.push(aiMessage);
        currentAiMessageElement = createMessageElement(aiMessage); // createMessageElement handles '...' or initial state
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
        const needsId = mode.includes('Id') || mode.includes('Sql');
        let convIdToSend = '1'; // Default ID
        if (needsId) {
            convIdToSend = conversationIdInput.value || conversations[activeConversationIndex]?.id || (activeConversationIndex + 1);
            if (!conversationIdInput.value && conversations[activeConversationIndex]?.id) {
                conversationIdInput.value = convIdToSend; // Update input if using conversation's ID
            }
            params.append('id', convIdToSend);
        }

        switch (mode) {
            case 'normal': endpoint = `${basePath}/chat`; break;
            case 'stream': endpoint = `${basePath}/stream`; break;
            case 'memory': endpoint = `${basePath}/chatMemory`; break;
            case 'streamMemory': endpoint = `${basePath}/streamChatMemory`; break;
            case 'memoryId': endpoint = `${basePath}/chatMemoryId`; break;
            case 'streamMemoryId': endpoint = `${basePath}/streamChatMemoryId`; break;
            case 'streamMemoryIdSql': endpoint = `${basePath}/streamChatMemoryIdSql`; break;
            case 'imageChat': endpoint = `${basePath}/imageChat`; break; // Added case
            default:
                console.error("Unknown chat mode:", mode);
                aiMessage.content = "错误：未知的聊天模式。";
                if (currentAiMessageContentElement) currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                saveConversations();
                currentAiMessageElement = null; currentAiMessageContentElement = null;
                return;
        }
        const fullUrl = `${endpoint}?${params.toString()}`;
        console.log("Requesting:", fullUrl, "Mode:", mode);

        // --- Handle Streaming (EventSource) ---
        if (mode.includes('stream')) {
            if (currentEventSource) { currentEventSource.close(); } // Close previous if any

            currentEventSource = new EventSource(fullUrl);

            currentEventSource.onopen = function() {
                console.log("SSE connection opened.");
                // Clear placeholder '...' if message content is still empty
                if (aiMessage.content === '' && currentAiMessageContentElement) {
                     currentAiMessageContentElement.innerHTML = '';
                }
                scrollToBottom();
            };

            currentEventSource.onmessage = function(event) {
                const errorTextToFilter = "抱歉，连接出现问题。请重试。";
                const doneSignal = "[DONE]";

                if (event.data === doneSignal) {
                    console.log(`Received '${doneSignal}', stream finished successfully.`);
                    streamSuccessfullyClosed = true;
                    if (currentEventSource) { currentEventSource.close(); currentEventSource = null; }
                    saveConversations();
                    scrollToBottom();
                    currentAiMessageElement = null; currentAiMessageContentElement = null;
                    return;
                }

                if (event.data === errorTextToFilter) {
                    console.warn(`[FILTER] Ignored specific text: "${errorTextToFilter}"`);
                    return;
                }

                if (aiMessage && currentAiMessageContentElement) {
                    // Append data and re-render using formatMessage
                    aiMessage.content += event.data;
                    currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                    throttledScrollToBottom();
                } else {
                    console.warn('AI message element not ready, ignoring data:', event.data);
                }
            };

            currentEventSource.onerror = function(error) {
                console.error('EventSource error:', error);
                // Avoid showing generic network errors directly to user unless necessary
                 if (!streamSuccessfullyClosed && currentAiMessageContentElement) {
                    // Only add error text if the message is still empty or doesn't already indicate an issue
                     if (!aiMessage.content || (!aiMessage.content.includes("连接出错") && !aiMessage.content.includes("已中止"))) {
                         aiMessage.content += "\n\n";
                         currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                     }
                 }

                streamSuccessfullyClosed = false; // Error means not successfully closed
                if (currentEventSource) { currentEventSource.close(); currentEventSource = null; }
                saveConversations();
                scrollToBottom();
                currentAiMessageElement = null; currentAiMessageContentElement = null;
            };

            // Note: 'close' event is not standard/reliable in EventSource
        }
        // --- Handle Non-Streaming (Fetch) ---
        else {
            fetch(fullUrl)
                .then(response => {
                    if (!response.ok) {
                         // Try to get more specific error text from response body
                         return response.text().then(text => { throw new Error(`HTTP ${response.status}: ${text || response.statusText || 'Server error'}`); });
                    }
                    return response.text(); // Expecting text (either chat response or image URL)
                })
                .then(data => {
                    // --- IMAGE CHAT HANDLING ---
                    if (mode === 'imageChat') {
                        aiMessage.content = data; // Store the URL
                        if (currentAiMessageContentElement) {
                            // Use the createMessageElement logic to render the image
                            const tempMsg = { role: 'ai', content: data };
                            const renderedContent = createMessageElement(tempMsg).querySelector('.message-content');
                             currentAiMessageContentElement.innerHTML = renderedContent.innerHTML; // Replace content
                        } else {
                             console.warn("AI message element no longer available for image rendering");
                        }
                    }
                    // --- OTHER NON-STREAMING HANDLING ---
                    else {
                        aiMessage.content = data;
                        if (currentAiMessageContentElement) {
                            currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                        } else {
                            console.warn("AI message element no longer available for text rendering");
                        }
                    }

                    streamSuccessfullyClosed = true; // Mark non-stream as successful on completion
                    saveConversations();
                    scrollToBottom();
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                    aiMessage.content = `请求失败: ${error.message}`;
                     if (currentAiMessageContentElement) {
                         currentAiMessageContentElement.innerHTML = formatMessage(aiMessage.content);
                     }
                     streamSuccessfullyClosed = false;
                    saveConversations();
                    scrollToBottom();
                })
                .finally(() => {
                    // Reset references after fetch completes or fails
                    currentAiMessageElement = null;
                    currentAiMessageContentElement = null;
                });
        }
    }

    // --- UI Helpers ---
    function updateAppNameInUI() {
        const h1 = document.querySelector('header h1');
        let appName = 'AI'; // Default
        if (h1) {
            const span = h1.querySelector('span');
             if(span) appName = span.textContent.replace(/聊天助手/,'').trim() || appName;
             else appName = h1.textContent.replace(/聊天助手/,'').trim() || appName;
        }
        console.log("App Name:", appName);
        // Update welcome message if it exists
        const welcomeElement = chatMessages.querySelector('.message.system .message-content p');
        if (welcomeElement && welcomeElement.textContent.includes('欢迎使用')) {
            welcomeElement.textContent = `欢迎使用 ${appName} 聊天助手。请在下方输入消息开始对话。`;
        }
    }

    // --- Start the application ---
    init();

}); // End DOMContentLoaded
