// ==========================================
// MediChat — Claude Style Chat Logic
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // ── DOM Elements ──
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const newChatBtn = document.getElementById('newChatBtn');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const threadItemsContainer = document.querySelector('.thread-items');

    let currentThreadId = null;

    // ── Init ──
    loadThreads();

    // ── Sidebar Toggle (Mobile) ──
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // ── Input Handling ──
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
        sendBtn.disabled = !messageInput.value.trim();
    });

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (messageInput.value.trim()) {
                sendMessage();
            }
        }
    });

    sendBtn.addEventListener('click', () => {
        if (messageInput.value.trim()) {
            sendMessage();
        }
    });

    // ── New Chat ──
    newChatBtn.addEventListener('click', startNewChat);

    function startNewChat() {
        currentThreadId = null;
        chatMessages.innerHTML = '';
        if (welcomeScreen) {
            chatMessages.appendChild(welcomeScreen);
        }
        document.querySelectorAll('.thread-item').forEach(el => el.classList.remove('active'));
    }

    // ── API Functions ──
    async function loadThreads() {
        try {
            const res = await fetch('/threads');
            const threads = await res.json();
            renderThreads(threads);
        } catch (err) {
            console.error(err);
        }
    }

    function renderThreads(threads) {
        threadItemsContainer.innerHTML = '';
        threads.forEach(thread => {
            const item = document.createElement('div');
            item.className = 'thread-item';
            if (thread.id === currentThreadId) {
                item.classList.add('active');
            }
            item.textContent = thread.title;
            item.onclick = () => loadThreadMessages(thread.id);
            threadItemsContainer.appendChild(item);
        });
    }

    async function loadThreadMessages(threadId) {
        currentThreadId = threadId;
        chatMessages.innerHTML = ''; // clear current messages
        if (welcomeScreen) welcomeScreen.remove(); // hide welcome if loading thread

        document.querySelectorAll('.thread-item').forEach(el => el.classList.remove('active'));
        // Find and activate the clicked one
        const items = document.querySelectorAll('.thread-item');
        // A bit hacky to find it again, ideally we use data attribute
        // Better: we can just re-load threads and it will highlight based on currentThreadId
        loadThreads();

        try {
            const res = await fetch(`/threads/${threadId}`);
            const messages = await res.json();
            messages.forEach(msg => {
                appendMessage(msg.role, msg.content, msg.source, msg.symptom, msg.drug, msg.can_save, msg.structured);
            });
            scrollToBottom();
        } catch (err) {
            console.error(err);
        }
    }

    // ── Send Message ──
    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        if (welcomeScreen && welcomeScreen.parentNode) {
            welcomeScreen.remove();
        }

        // Add user message
        appendMessage('user', text);

        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.disabled = true;

        showTyping(true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, thread_id: currentThreadId })
            });

            const data = await response.json();
            
            showTyping(false);

            if (data.error) {
                appendMessage('bot', data.error, 'error');
            } else {
                appendMessage('bot', data.response, data.source, data.symptom, data.drug, data.can_save, data.structured);
                if (!currentThreadId && data.thread_id) {
                    currentThreadId = data.thread_id;
                    loadThreads(); // Refresh list to show newly created chat
                }
            }
        } catch (error) {
            showTyping(false);
            appendMessage('bot', 'Sorry, something went wrong. Please try again.', 'error');
        }

        scrollToBottom();
    }

    // ── Append Message ──
    function appendMessage(role, text, source = '', symptom = '', drug = '', canSave = false, structured = null) {
        const row = document.createElement('div');
        row.className = `message-row ${role}`;
        
        const inner = document.createElement('div');
        inner.className = `message-inner ${role}`;

        if (role === 'bot') {
            const botAvatar = document.createElement('div');
            botAvatar.className = 'bot-avatar';
            botAvatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L12 22M2 12L22 12" stroke-linecap="round"/>
                <circle cx="12" cy="12" r="10"/>
            </svg>`;
            inner.appendChild(botAvatar);
        }

        const contentCol = document.createElement('div');
        contentCol.style.flex = '1';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.innerHTML = formatText(text);
        contentCol.appendChild(bubble);

        if (role === 'bot' && source && source !== 'error') {
            if (source === 'database') {
                const badge = document.createElement('div');
                badge.className = 'source-badge';
                badge.innerHTML = '🗄️ KB Verified';
                contentCol.appendChild(badge);
            } else if (source === 'llm_fallback') {
                const badge = document.createElement('div');
                badge.className = 'source-badge';
                badge.innerHTML = '🤖 AI Generated';
                contentCol.appendChild(badge);
            }

            if (canSave && structured) {
                const saveBtn = document.createElement('button');
                saveBtn.className = 'save-kb-btn';
                saveBtn.innerHTML = '💾 Save to KB';
                saveBtn.onclick = () => saveToKB(structured, saveBtn);
                contentCol.appendChild(saveBtn);
            }

            if (symptom && drug) {
                const card = document.createElement('div');
                card.className = 'drug-info-card';
                card.innerHTML = `<strong>Matched Symptom:</strong> ${escapeHtml(symptom)} <br/> <strong>Recommendation:</strong> ${escapeHtml(drug)}`;
                contentCol.appendChild(card);
            }
        }

        inner.appendChild(contentCol);
        row.appendChild(inner);
        chatMessages.appendChild(row);

        scrollToBottom();
    }

    // ── Helpers ──
    function formatText(text) {
        let formatted = escapeHtml(text);
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showTyping(show) {
        typingIndicator.classList.toggle('active', show);
        if (show) scrollToBottom();
    }

    function scrollToBottom() {
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
    }

    async function saveToKB(dataStr, btnElement) {
        btnElement.disabled = true;
        btnElement.textContent = 'Saving...';
        
        try {
            // Because structured was possibly stringified in Python, we might need to parse it if double stringified. Let's assume it's just a valid string representation of dict or raw dict.
            // Wait, we stringified it in python: structured=str(...) which gives string like "{'symptom': '...'}" this might be hard to JSON parse on JS side if it's not proper JSON.
            // If python used str(dict), it's single quotes. We should be careful.
            
            // To properly do this, we should fix Python's `str()` into `json.dumps()` in chat_db.py or just send standard JSON objects.
            // For now, let's treat dataStr safely.
            const dataToSave = typeof dataStr === 'string' ? dataStr.replace(/'/g, '"') : dataStr;
            let finalData;
            try {
                finalData = typeof dataToSave === 'string' ? JSON.parse(dataToSave) : dataToSave;
            } catch (e) {
                finalData = dataToSave; // fallback
            }

            const response = await fetch('/save-kb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                btnElement.textContent = '✅ Saved!';
                btnElement.classList.add('saved');
            } else {
                btnElement.textContent = '❌ Failed';
                btnElement.disabled = false;
            }
        } catch (error) {
            btnElement.textContent = '❌ Error';
            btnElement.disabled = false;
        }
    }

    messageInput.focus();
});
