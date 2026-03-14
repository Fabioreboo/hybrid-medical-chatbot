// ==========================================
// MediChat — Chat Logic & Interactions
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // ── DOM Elements ──
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const clearChatBtn = document.getElementById('clearChat');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    // ── Sidebar Toggle (Mobile) ──
    let overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    });

    // ── Input Handling ──
    messageInput.addEventListener('input', () => {
        // Auto-resize textarea
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
        
        // Toggle send button
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

    // ── Quick Prompts ──
    document.querySelectorAll('.prompt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.getAttribute('data-prompt');
            messageInput.value = prompt;
            sendBtn.disabled = false;
            sendMessage();
        });
    });

    // ── Clear Chat ──
    clearChatBtn.addEventListener('click', () => {
        chatMessages.innerHTML = '';
        chatMessages.appendChild(createWelcomeScreen());
        welcomeScreen !== null; // re-reference
    });

    // ── Send Message ──
    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;

        // Hide welcome screen
        const welcome = document.getElementById('welcomeScreen');
        if (welcome) welcome.remove();

        // Add user message
        appendMessage('user', text);

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.disabled = true;

        // Show typing indicator
        showTyping(true);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            const data = await response.json();
            
            // short delay for realism
            await sleep(400);
            showTyping(false);

            if (data.error) {
                appendMessage('bot', data.error, 'error');
            } else {
                appendMessage('bot', data.response, data.source, data.symptom, data.drug, data.can_save, data.structured);
            }
        } catch (error) {
            showTyping(false);
            appendMessage('bot', 'Sorry, something went wrong. Please try again.', 'error');
        }

        scrollToBottom();
    }

    // ── Append Message ──
    function appendMessage(type, text, source = '', symptom = '', drug = '', canSave = false, structured = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        if (type === 'user') {
            avatar.textContent = 'You';
        } else {
            avatar.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L12 22M2 12L22 12" stroke-linecap="round"/>
                <circle cx="12" cy="12" r="10"/>
            </svg>`;
        }

        const content = document.createElement('div');
        content.className = 'message-content';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        // Format the text with basic markdown-like handling
        bubble.innerHTML = formatText(text);

        content.appendChild(bubble);

        // Add source badge for bot messages
        if (type === 'bot' && source && source !== 'error') {
            const badge = document.createElement('span');
            
            if (source === 'database') {
                badge.className = 'source-badge database';
                badge.innerHTML = '🗄️ Verified from Knowledge Base';
            } else if (source === 'llm_fallback') {
                badge.className = 'source-badge fallback';
                badge.innerHTML = '🤖 AI-Generated Response';
            }
            
            content.appendChild(badge);

            // Add Save to KB button for LLM responses
            if (canSave && structured) {
                const saveBtn = document.createElement('button');
                saveBtn.className = 'save-kb-btn';
                saveBtn.innerHTML = '💾 Save to Knowledge Base';
                saveBtn.onclick = () => saveToKB(structured, saveBtn);
                content.appendChild(saveBtn);
            }

            // Add drug info card if available
            if (symptom && drug) {
                const card = document.createElement('div');
                card.className = 'drug-info-card';
                card.innerHTML = `
                    <div class="drug-label">💊 Matched: ${escapeHtml(symptom)}</div>
                    <div class="drug-value">Recommended: ${escapeHtml(drug)}</div>
                `;
                content.appendChild(card);
            }
        }

        // Timestamp
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = getTimeString();
        content.appendChild(timeDiv);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        chatMessages.appendChild(messageDiv);

        scrollToBottom();
    }

    // ── Helpers ──
    function formatText(text) {
        // Convert markdown-like bold and italic
        let formatted = escapeHtml(text);
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/\n/g, '<br>');
        // Handle the disclaimer symbol
        formatted = formatted.replace(/⚠️/g, '⚠️');
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

    function getTimeString() {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function saveToKB(data, btnElement) {
        btnElement.disabled = true;
        btnElement.textContent = 'Saving...';
        
        try {
            const response = await fetch('/save-kb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
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

    function createWelcomeScreen() {
        const container = document.createElement('div');
        container.className = 'welcome-container';
        container.id = 'welcomeScreen';
        container.innerHTML = `
            <div class="welcome-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2L12 22M2 12L22 12" stroke-linecap="round"/>
                    <circle cx="12" cy="12" r="10"/>
                </svg>
            </div>
            <h2 class="welcome-title">How can I help you today?</h2>
            <p class="welcome-subtitle">Describe your symptoms and I'll provide information from our verified medical knowledge base.</p>
            <div class="quick-prompts">
                <button class="prompt-chip" data-prompt="I have a headache">
                    <span class="chip-icon">🤕</span> Headache
                </button>
                <button class="prompt-chip" data-prompt="I have a runny nose">
                    <span class="chip-icon">🤧</span> Runny nose
                </button>
                <button class="prompt-chip" data-prompt="I feel nauseous">
                    <span class="chip-icon">🤢</span> Nausea
                </button>
                <button class="prompt-chip" data-prompt="I have a sore throat">
                    <span class="chip-icon">😷</span> Sore throat
                </button>
                <button class="prompt-chip" data-prompt="I have a fever">
                    <span class="chip-icon">🌡️</span> Fever
                </button>
                <button class="prompt-chip" data-prompt="I have back pain">
                    <span class="chip-icon">💪</span> Back pain
                </button>
            </div>
        `;

        // Re-attach event listeners to new chips
        container.querySelectorAll('.prompt-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.getAttribute('data-prompt');
                messageInput.value = prompt;
                sendBtn.disabled = false;
                sendMessage();
            });
        });

        return container;
    }

    // ── Focus input on load ──
    messageInput.focus();
});
