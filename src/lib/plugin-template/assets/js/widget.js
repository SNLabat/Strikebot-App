/**
 * Strikebot Widget JavaScript
 * Enhanced with chat history, settings, and advanced features
 */
(function() {
    'use strict';

    // Generate unique session ID
    function generateSessionId() {
        return 'sb_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    // Get or create session ID
    function getSessionId() {
        let sessionId = sessionStorage.getItem('strikebot_session');
        if (!sessionId) {
            sessionId = generateSessionId();
            sessionStorage.setItem('strikebot_session', sessionId);
        }
        return sessionId;
    }

    let currentSessionId = getSessionId();
    let currentMessages = [];

    // DOM Elements
    const widget = document.getElementById('strikebot-widget');
    const chat = document.getElementById('strikebot-chat');
    const toggle = document.getElementById('strikebot-toggle');
    const closeBtn = document.querySelector('.strikebot-chat-close');
    const messages = document.getElementById('strikebot-messages');
    const input = document.getElementById('strikebot-input');
    const sendBtn = document.getElementById('strikebot-send');
    const toggleOpen = document.querySelector('.strikebot-toggle-open');
    const toggleClose = document.querySelector('.strikebot-toggle-close');
    const hamburger = document.getElementById('strikebot-hamburger-menu');
    const sidebar = document.getElementById('strikebot-sidebar');
    const sidebarOverlay = document.getElementById('strikebot-sidebar-overlay');
    const newChatBtn = document.getElementById('strikebot-sidebar-new-chat');
    const clearAllBtn = document.getElementById('strikebot-clear-all-chats');
    const clearProgressBar = document.getElementById('strikebot-clear-progress-bar');
    const scrollBottomBtn = document.getElementById('strikebot-scroll-to-bottom');
    const exportBtn = document.getElementById('strikebot-export-chat');
    const closeSidebarBtn = document.getElementById('strikebot-sidebar-back');
    const historyList = document.getElementById('strikebot-chat-history-list');
    const soundToggle = document.getElementById('strikebot-sound-toggle');
    const timestampsToggle = document.getElementById('strikebot-timestamps-toggle');

    // State
    let isOpen = false;
    let isLoading = false;
    let unreadMessages = 0;
    let clearAllHoldTime = 0;
    let clearAllInterval = null;

    // Settings structure
    const defaultSettings = {
        fontSize: 'medium',
        soundNotifications: false,
        showTimestamps: false
    };

    // Load settings from localStorage
    function loadSettings() {
        const stored = localStorage.getItem('strikebot_settings_local');
        return stored ? JSON.parse(stored) : defaultSettings;
    }

    // Save settings to localStorage
    function saveSettings(settings) {
        localStorage.setItem('strikebot_settings_local', JSON.stringify(settings));
        applySettings(settings);
    }

    // Apply settings to the UI
    function applySettings(settings) {
        // Apply font size using CSS classes on widget
        var fontClasses = ['strikebot-font-small', 'strikebot-font-medium', 'strikebot-font-large', 'strikebot-font-xlarge'];
        var classMap = {
            'small': 'strikebot-font-small',
            'medium': 'strikebot-font-medium',
            'large': 'strikebot-font-large',
            'x-large': 'strikebot-font-xlarge'
        };
        if (widget) {
            fontClasses.forEach(function(cls) { widget.classList.remove(cls); });
            var targetClass = classMap[settings.fontSize] || classMap['medium'];
            widget.classList.add(targetClass);
        }

        // Show/hide timestamps
        document.querySelectorAll('.strikebot-message-time').forEach(function(el) {
            el.classList.toggle('hidden', !settings.showTimestamps);
        });

        // Update font size button active states
        document.querySelectorAll('.strikebot-font-size-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-size') === settings.fontSize);
        });
    }

    // Generate timestamp string
    function formatTimestamp(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
        return displayHours + ':' + displayMinutes + ' ' + ampm;
    }

    // Get current timestamp
    function getCurrentTimestamp() {
        return new Date();
    }

    // Play notification sound using Web Audio API
    function playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.warn('Could not play notification sound:', e);
        }
    }

    // Chat History Management Functions

    // Load all chat history
    function loadChatHistory() {
        const stored = localStorage.getItem('strikebot_chat_history');
        return stored ? JSON.parse(stored) : [];
    }

    // Save all chat history
    function saveChatHistory(history) {
        // Keep only last 50 conversations
        if (history.length > 50) {
            history = history.slice(-50);
        }
        localStorage.setItem('strikebot_chat_history', JSON.stringify(history));
    }

    // Get conversation title from first user message
    function getConversationTitle(messages) {
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].isUser) {
                const preview = messages[i].content.substring(0, 50);
                return preview.length < messages[i].content.length ? preview + '...' : preview;
            }
        }
        return 'New Chat';
    }

    // Save current conversation to history
    function saveCurrentConversation() {
        if (currentMessages.length === 0) {
            return;
        }

        const history = loadChatHistory();
        const existingIndex = history.findIndex(function(item) {
            return item.sessionId === currentSessionId;
        });

        const conversationData = {
            sessionId: currentSessionId,
            title: getConversationTitle(currentMessages),
            messages: currentMessages,
            timestamp: new Date().toISOString(),
            messageCount: currentMessages.length
        };

        if (existingIndex !== -1) {
            history[existingIndex] = conversationData;
        } else {
            history.push(conversationData);
        }

        saveChatHistory(history);
    }

    // Load conversation by session ID
    function loadConversation(sessionId) {
        const history = loadChatHistory();
        const conversation = history.find(function(item) {
            return item.sessionId === sessionId;
        });

        if (conversation) {
            currentSessionId = sessionId;
            currentMessages = conversation.messages;
            messages.innerHTML = '';
            const settings = loadSettings();

            conversation.messages.forEach(function(msg) {
                addMessageToDOM(msg.content, msg.isUser, msg.timestamp);
            });

            unreadMessages = 0;
            updateScrollButton();
            closeSidebar();
        }
    }

    // Delete conversation from history
    function deleteConversation(sessionId) {
        let history = loadChatHistory();
        history = history.filter(function(item) {
            return item.sessionId !== sessionId;
        });
        saveChatHistory(history);
        refreshHistoryList();

        if (sessionId === currentSessionId) {
            startNewChat();
        }
    }

    // Clear all conversations
    function clearAllConversations() {
        localStorage.removeItem('strikebot_chat_history');
        refreshHistoryList();
        startNewChat();
    }

    // Refresh the history list in sidebar
    function refreshHistoryList() {
        const history = loadChatHistory();
        historyList.innerHTML = '';

        if (history.length === 0) {
            historyList.innerHTML = '<div class="strikebot-history-empty">No conversations yet</div>';
            return;
        }

        // Show most recent first
        const sortedHistory = history.slice().reverse();
        sortedHistory.forEach(function(item) {
            const historyItem = document.createElement('div');
            historyItem.className = 'strikebot-history-item';
            if (item.sessionId === currentSessionId) {
                historyItem.classList.add('active');
            }

            const timestamp = new Date(item.timestamp);
            const dateStr = timestamp.toLocaleDateString() + ' ' + timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            historyItem.innerHTML =
                '<div class="strikebot-history-item-title">' + escapeHtml(item.title) + '</div>' +
                '<div class="strikebot-history-item-meta">' + dateStr + ' (' + item.messageCount + ' messages)</div>' +
                '<button class="strikebot-history-item-delete" data-session-id="' + item.sessionId + '" title="Delete">×</button>';

            historyItem.addEventListener('click', function(e) {
                if (e.target.classList.contains('strikebot-history-item-delete')) {
                    e.stopPropagation();
                    deleteConversation(item.sessionId);
                } else {
                    loadConversation(item.sessionId);
                }
            });

            historyList.appendChild(historyItem);
        });
    }

    // Start new chat
    function startNewChat() {
        saveCurrentConversation();
        currentSessionId = generateSessionId();
        sessionStorage.setItem('strikebot_session', currentSessionId);
        currentMessages = [];
        messages.innerHTML = '';
        input.value = '';
        unreadMessages = 0;
        updateScrollButton();
        refreshHistoryList();

        // Show welcome message
        addMessageToDOM('Hello! How can I help you today?', false);
    }

    // Sidebar management
    function toggleSidebar() {
        if (!sidebar) return;
        var isOpening = !sidebar.classList.contains('strikebot-sidebar-open');
        sidebar.classList.toggle('strikebot-sidebar-open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.toggle('hidden', !isOpening);
        }
        if (isOpening) {
            refreshHistoryList();
        }
    }

    function closeSidebar() {
        if (!sidebar) return;
        sidebar.classList.remove('strikebot-sidebar-open');
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('hidden');
        }
    }

    // Scroll to bottom button
    function updateScrollButton() {
        if (!scrollBottomBtn) return;

        const isAtBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 100;
        scrollBottomBtn.classList.toggle('hidden', isAtBottom);

        if (!isAtBottom && unreadMessages > 0) {
            const badge = scrollBottomBtn.querySelector('.strikebot-unread-badge');
            if (badge) {
                badge.textContent = unreadMessages;
                badge.style.display = 'block';
            }
        } else if (isAtBottom) {
            const badge = scrollBottomBtn.querySelector('.strikebot-unread-badge');
            if (badge) {
                badge.style.display = 'none';
            }
            unreadMessages = 0;
        }
    }

    // Export chat as text file
    function exportChat() {
        if (currentMessages.length === 0) {
            alert('No messages to export');
            return;
        }

        let exportText = 'Conversation exported on ' + new Date().toLocaleString() + '\n';
        exportText += '='.repeat(50) + '\n\n';

        currentMessages.forEach(function(msg) {
            const prefix = msg.isUser ? 'User: ' : 'Bot: ';
            const timestamp = msg.timestamp ? ' (' + formatTimestamp(new Date(msg.timestamp)) + ')' : '';
            exportText += prefix + timestamp + '\n';
            exportText += msg.content + '\n\n';
        });

        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'strikebot-chat-' + currentSessionId + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Decode HTML entities so markdown like [text](url) is recognized even if brackets were encoded
    function decodeHtmlEntities(str) {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = str;
        return textarea.value;
    }

    // Normalize URL for href and escape " for attribute
    function normalizeHref(url) {
        const a = document.createElement('a');
        a.href = url;
        return a.href.replace(/"/g, '&quot;');
    }

    // Linkify text - convert markdown links [text](url), URLs, emails, and phone numbers to clickable links
    function linkify(text) {
        if (!text || typeof text !== 'string') return '';
        let processedText = decodeHtmlEntities(text);
        let linkMap = {};
        let linkCounter = 0;

        // First, extract and convert markdown-style links [text](url) BEFORE HTML escaping
        // Allow optional space between ] and ( for robustness
        processedText = processedText.replace(
            /\[([^\]]*)\](\s*)\(([^)]+)\)/g,
            function(match, linkText, space, url) {
                const placeholder = '___LINK_PLACEHOLDER_' + linkCounter + '___';
                const escapedLinkText = document.createElement('div');
                escapedLinkText.textContent = linkText;
                const safeHref = normalizeHref(url.trim());
                linkMap[placeholder] = '<a href="' + safeHref + '" target="_blank" rel="noopener noreferrer" class="strikebot-link">' + escapedLinkText.innerHTML + '</a>';
                linkCounter++;
                return placeholder;
            }
        );

        // Now escape all remaining HTML to prevent XSS
        const div = document.createElement('div');
        div.textContent = processedText;
        let escapedText = div.innerHTML;

        // Trim trailing sentence punctuation so it isn't inside the link
        function trimTrailingPunctuation(s) {
            const m = s.match(/^(.+?)([.,;:!?'")\]]+)$/);
            return m ? { core: m[1], suffix: m[2] } : { core: s, suffix: '' };
        }

        // Convert plain URLs, emails, and phones BEFORE restoring markdown links,
        // so we never replace URLs that are already inside href="..."
        escapedText = escapedText.replace(
            /(\b(https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?'")\]])[.,;:!?'")\]]*/gi,
            function(match) {
                const { core: url, suffix } = trimTrailingPunctuation(match);
                let href = url;
                if (!url.match(/^https?:\/\//i)) {
                    href = 'http://' + url;
                }
                const safeHref = normalizeHref(href);
                return '<a href="' + safeHref + '" target="_blank" rel="noopener noreferrer" class="strikebot-link">' + url + '</a>' + suffix;
            }
        );

        escapedText = escapedText.replace(
            /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)[.,;:!?'")\]]*/gi,
            function(match) {
                const { core: email, suffix } = trimTrailingPunctuation(match);
                return '<a href="mailto:' + email + '" class="strikebot-link strikebot-link-email">' + email + '</a>' + suffix;
            }
        );

        escapedText = escapedText.replace(
            /((\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b)[.,;:!?'")\]]*/g,
            function(match) {
                const { core: phone, suffix } = trimTrailingPunctuation(match);
                const cleanPhone = phone.replace(/[^\d+]/g, '');
                return '<a href="tel:' + cleanPhone + '" class="strikebot-link strikebot-link-phone">' + phone + '</a>' + suffix;
            }
        );

        // Restore markdown links last so their href URLs are never matched by the plain-URL regex
        const placeholders = Object.keys(linkMap).sort();
        for (let i = 0; i < placeholders.length; i++) {
            escapedText = escapedText.split(placeholders[i]).join(linkMap[placeholders[i]]);
        }

        return escapedText;
    }

    // Toggle chat
    function toggleChat() {
        isOpen = !isOpen;
        chat.classList.toggle('hidden', !isOpen);
        toggleOpen.classList.toggle('hidden', isOpen);
        toggleClose.classList.toggle('hidden', !isOpen);

        if (isOpen) {
            input.focus();
            closeSidebar();
        }
    }

    // Add message to DOM with all features
    function addMessageToDOM(content, isUser = false, timestamp = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'strikebot-message ' + (isUser ? 'strikebot-message-user' : 'strikebot-message-bot');

        let avatarHtml = '';
        if (!isUser) {
            const settings = window.strikebotWidget?.settings || {};
            const iconUrl = settings.widget?.iconUrl || '';

            if (iconUrl) {
                avatarHtml = '<div class="strikebot-message-avatar"><img src="' + iconUrl + '" alt=""></div>';
            } else {
                avatarHtml = '<div class="strikebot-message-avatar">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor">' +
                    '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
                    '</svg></div>';
            }
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'strikebot-message-content';

        // For bot messages, linkify the content. For user messages, keep as plain text
        if (!isUser) {
            contentDiv.innerHTML = linkify(content);
        } else {
            contentDiv.textContent = content;
        }

        const settings = loadSettings();
        const fontSizes = {
            'small': '12px',
            'medium': '14px',
            'large': '16px',
            'x-large': '18px'
        };
        contentDiv.style.fontSize = fontSizes[settings.fontSize] || fontSizes['medium'];

        messageDiv.appendChild(contentDiv);

        // Add timestamp if setting is enabled
        if (settings.showTimestamps) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'strikebot-message-time';
            timeDiv.textContent = formatTimestamp(timestamp || new Date());
            contentDiv.appendChild(timeDiv);
        }

        // Add copy button for bot messages
        if (!isUser) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'strikebot-copy-btn';
            copyBtn.title = 'Copy message';
            copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>' +
                '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>' +
                '</svg>';

            copyBtn.addEventListener('click', function() {
                const text = contentDiv.textContent.replace(/\s+\d+:\d+\s(AM|PM)$/, '').trim();
                navigator.clipboard.writeText(text).then(function() {
                    const originalText = copyBtn.title;
                    copyBtn.title = 'Copied!';
                    setTimeout(function() {
                        copyBtn.title = originalText;
                    }, 2000);
                });
            });

            messageDiv.appendChild(copyBtn);
        }

        if (avatarHtml) {
            messageDiv.insertAdjacentHTML('afterbegin', avatarHtml);
        }

        messages.appendChild(messageDiv);

        // Add rating buttons for bot messages
        if (!isUser) {
            addRatingButtons(contentDiv);
        }

        messages.scrollTop = messages.scrollHeight;
    }

    // Add message to chat (wrapper for adding to current session)
    function addMessage(content, isUser = false) {
        const timestamp = getCurrentTimestamp();
        currentMessages.push({
            content: content,
            isUser: isUser,
            timestamp: timestamp
        });

        addMessageToDOM(content, isUser, timestamp);

        if (!isUser) {
            unreadMessages++;
        }

        updateScrollButton();
        saveCurrentConversation();
    }

    // Add rating buttons to bot message
    function addRatingButtons(messageElement) {
        const ratingDiv = document.createElement('div');
        ratingDiv.className = 'strikebot-rating';
        ratingDiv.innerHTML =
            '<button class="strikebot-rating-btn strikebot-rating-up" data-rating="positive" title="Helpful" aria-label="This was helpful">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>' +
            '</svg>' +
            '</button>' +
            '<button class="strikebot-rating-btn strikebot-rating-down" data-rating="negative" title="Not helpful" aria-label="This was not helpful">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>' +
            '</svg>' +
            '</button>';

        messageElement.appendChild(ratingDiv);

        // Add click handlers
        ratingDiv.querySelectorAll('.strikebot-rating-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const rating = this.dataset.rating;
                submitRating(rating);

                // Visual feedback
                this.classList.add('strikebot-rating-selected');
                ratingDiv.querySelectorAll('.strikebot-rating-btn').forEach(function(b) {
                    b.disabled = true;
                });
            });
        });
    }

    // Submit rating to server
    function submitRating(rating) {
        const formData = new FormData();
        formData.append('action', 'strikebot_rate_message');
        formData.append('nonce', strikebotWidget.nonce);
        formData.append('session_id', currentSessionId);
        formData.append('rating', rating);

        fetch(strikebotWidget.ajaxUrl, {
            method: 'POST',
            body: formData
        }).then(function(response) {
            return response.json();
        }).then(function(data) {
            if (!data.success) {
                console.error('Failed to save rating:', data.data?.message);
            }
        }).catch(function(error) {
            console.error('Rating submission error:', error);
        });
    }

    // Add typing indicator
    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'strikebot-message strikebot-message-bot';
        typingDiv.id = 'typing-indicator';

        const settings = window.strikebotWidget?.settings || {};
        const iconUrl = settings.widget?.iconUrl || '';

        let avatarHtml = '';
        if (iconUrl) {
            avatarHtml = '<div class="strikebot-message-avatar"><img src="' + iconUrl + '" alt=""></div>';
        } else {
            avatarHtml = '<div class="strikebot-message-avatar">' +
                '<svg viewBox="0 0 24 24" fill="currentColor">' +
                '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>' +
                '</svg></div>';
        }

        typingDiv.innerHTML = avatarHtml +
            '<div class="strikebot-message-content strikebot-typing">' +
            '<span></span><span></span><span></span>' +
            '</div>';

        messages.appendChild(typingDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    // Remove typing indicator
    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Send message
    async function sendMessage() {
        const message = input.value.trim();

        if (!message || isLoading) {
            return;
        }

        isLoading = true;
        sendBtn.disabled = true;
        input.value = '';

        // Add user message
        addMessage(message, true);

        // Add typing indicator
        addTypingIndicator();

        try {
            const formData = new FormData();
            formData.append('action', 'strikebot_chat');
            formData.append('nonce', strikebotWidget.nonce);
            formData.append('message', message);
            formData.append('session_id', currentSessionId);

            const response = await fetch(strikebotWidget.ajaxUrl, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            removeTypingIndicator();

            if (data.success) {
                const settings = loadSettings();
                if (settings.soundNotifications) {
                    playNotificationSound();
                }
                addMessage(data.data.response);
            } else {
                addMessage(data.data?.message || 'Sorry, I encountered an error. Please try again.');
            }
        } catch (error) {
            console.error('Strikebot error:', error);
            removeTypingIndicator();
            addMessage('Sorry, I encountered an error. Please try again.');
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
            input.focus();
        }
    }

    // Clear all handler with press-and-hold
    function setupClearAllHandler() {
        if (!clearAllBtn) return;

        function startHold() {
            clearAllHoldTime = 0;
            const progressBar = clearProgressBar || clearAllBtn.querySelector('.strikebot-clear-progress-bar');
            if (progressBar) {
                progressBar.style.width = '0';
                progressBar.style.display = 'block';
            }

            clearAllInterval = setInterval(function() {
                clearAllHoldTime += 10;
                const progress = (clearAllHoldTime / 1500) * 100;
                if (progressBar) {
                    progressBar.style.width = progress + '%';
                }

                if (clearAllHoldTime >= 1500) {
                    clearInterval(clearAllInterval);
                    clearAllConversations();
                    const originalText = clearAllBtn.textContent;
                    clearAllBtn.textContent = 'Cleared!';
                    setTimeout(function() {
                        clearAllBtn.textContent = originalText;
                        if (progressBar) {
                            progressBar.style.display = 'none';
                        }
                    }, 1000);
                }
            }, 10);
        }

        function endHold() {
            clearInterval(clearAllInterval);
            clearAllHoldTime = 0;
            const progressBar = clearProgressBar || clearAllBtn.querySelector('.strikebot-clear-progress-bar');
            if (progressBar) {
                progressBar.style.width = '0';
                progressBar.style.display = 'none';
            }
        }

        clearAllBtn.addEventListener('mousedown', startHold);
        clearAllBtn.addEventListener('mouseup', endHold);
        clearAllBtn.addEventListener('mouseleave', endHold);
        clearAllBtn.addEventListener('touchstart', startHold);
        clearAllBtn.addEventListener('touchend', endHold);
    }

    // Scroll to bottom handler
    function setupScrollToBottomHandler() {
        if (!scrollBottomBtn) return;

        scrollBottomBtn.addEventListener('click', function() {
            messages.scrollTop = messages.scrollHeight;
        });

        messages.addEventListener('scroll', updateScrollButton);
    }

    // Settings panel handler
    function setupSettingsPanel() {
        var settings = loadSettings();

        // Font size buttons in sidebar
        document.querySelectorAll('.strikebot-font-size-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                var size = btn.getAttribute('data-size');
                if (size) {
                    settings.fontSize = size;
                    saveSettings(settings);
                    applySettings(settings);
                    // Update active state on buttons
                    document.querySelectorAll('.strikebot-font-size-btn').forEach(function(b) {
                        b.classList.toggle('active', b.getAttribute('data-size') === size);
                    });
                }
            });
        });

        // Sound toggle
        if (soundToggle) {
            soundToggle.checked = settings.soundNotifications;
            soundToggle.addEventListener('change', function() {
                settings.soundNotifications = soundToggle.checked;
                saveSettings(settings);
            });
        }

        // Timestamps toggle
        if (timestampsToggle) {
            timestampsToggle.checked = settings.showTimestamps;
            timestampsToggle.addEventListener('change', function() {
                settings.showTimestamps = timestampsToggle.checked;
                saveSettings(settings);
                applySettings(settings);
            });
        }

        // Apply initial settings
        applySettings(settings);

        // Set initial active state on font size buttons
        document.querySelectorAll('.strikebot-font-size-btn').forEach(function(btn) {
            btn.classList.toggle('active', btn.getAttribute('data-size') === settings.fontSize);
        });
    }

    // Initialize chat with loaded history or welcome message
    function initializeChat() {
        const settings = loadSettings();
        applySettings(settings);

        if (currentMessages.length === 0) {
            addMessage('Hello! How can I help you today?');
        }

        refreshHistoryList();
    }

    // Event listeners - Original functionality
    toggle.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    sendBtn.addEventListener('click', sendMessage);

    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Close on escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (sidebar && sidebar.classList.contains('strikebot-sidebar-open')) {
                closeSidebar();
            } else if (isOpen) {
                toggleChat();
            }
        }
    });

    // Close when clicking outside
    document.addEventListener('click', function(e) {
        if (isOpen && !widget.contains(e.target)) {
            toggleChat();
        }
    });

    // New feature event listeners
    if (hamburger) {
        hamburger.addEventListener('click', toggleSidebar);
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }

    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportChat);
    }

    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
        if (sidebar && sidebar.classList.contains('strikebot-sidebar-open') &&
            !sidebar.contains(e.target) && !hamburger.contains(e.target)) {
            closeSidebar();
        }
    });

    // No separate settings panel - settings are in the sidebar

    // Setup all new feature handlers
    setupClearAllHandler();
    setupScrollToBottomHandler();
    setupSettingsPanel();

    // Initialize
    initializeChat();

})();
