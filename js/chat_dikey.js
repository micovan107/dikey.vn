document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;

    let currentUser;
    let openChatWindows = [];

    const defaultGroupAvatars = {
        'group_hoc_tap': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxqEOBB_zQRIYACT3EoyGiaIQ9mjLYDdjjEQ&s',
        'group_tro_chuyen': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQWgpRn0toA90-YGGROPeTV0mzQon8am6avTQ&s',
        'group_giao_luu': 'https://cdn.lazi.vn/storage/uploads/photo/1762689393_lazi_235423.jpg',
        'group_cong_dong_viet': 'https://cdn.lazi.vn/storage/uploads/photo/1762689473_lazi_103824.png'
    };

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;

            // Set up presence management for the current user
            const presenceRef = db.ref(`presence/${currentUser.uid}`);
            const amOnline = db.ref('.info/connected');

            amOnline.on('value', (snapshot) => {
                if (snapshot.val() === true) {
                    presenceRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
                    presenceRef.set('online');
                }
            });

            chatContainer.innerHTML = `
                <div class="chat-widget">
                    <div class="chat-header">
                        <span>Tin nhắn</span>
                        <div>
                            <button id="toggle-chat-list"><i class="fas fa-chevron-up"></i></button>
                            <button id="close-chat-widget"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                    <div class="chat-list-container">
                        <div class="chat-search-container">
                            <input type="text" id="chat-user-search" placeholder="Tìm kiếm người dùng...">
                        </div>
                        <div id="chat-list"></div>
                    </div>
                </div>
            `;

            const chatHeader = document.querySelector('.chat-header');
            const toggleButton = document.getElementById('toggle-chat-list');
            const chatListContainer = document.querySelector('.chat-list-container');

            chatHeader.addEventListener('click', () => {
                chatListContainer.classList.toggle('open');
                toggleButton.querySelector('i').classList.toggle('fa-chevron-up');
                toggleButton.querySelector('i').classList.toggle('fa-chevron-down');
            });

            const closeWidgetButton = document.getElementById('close-chat-widget');
            const chatWidget = document.querySelector('.chat-widget');

            closeWidgetButton.addEventListener('click', () => {
                chatWidget.style.display = 'none';
            });

            const searchInput = document.getElementById('chat-user-search');
            searchInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                document.querySelectorAll('#chat-list .chat-list-item').forEach(item => {
                    const itemName = item.dataset.name.toLowerCase();
                    if (itemName.includes(searchTerm)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });

            loadChatList();
            listenForNewMessages();
        } else {
            currentUser = null;
            chatContainer.innerHTML = '';
            openChatWindows = [];
        }
    });

    function getPrivateChatId(userId1, userId2) {
        return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
    }

    async function getUserData(userId) {
        const userRef = db.ref(`users/${userId}`);
        const snapshot = await userRef.get();
        return snapshot.val() || {};
    }

    function loadChatList() {
        const chatList = document.getElementById('chat-list');
        if (!chatList) return;

        // Event delegation for chat list items
        if (!chatList.dataset.listenerAttached) {
            chatList.addEventListener('click', (e) => {
                const item = e.target.closest('.chat-list-item');
                if (item) {
                    const targetId = item.dataset.id;
                    const chatName = item.dataset.name;
                    const isGroup = item.dataset.isGroup === 'true';
                    const chatId = isGroup ? targetId : getPrivateChatId(currentUser.uid, targetId);
                    openChatWindow(chatId, chatName, isGroup);
                }
            });
            chatList.dataset.listenerAttached = 'true';
        }

        const defaultRooms = [
            { id: 'group_hoc_tap', name: 'Phòng học tập', isGroup: true },
            { id: 'group_tro_chuyen', name: 'Phòng trò chuyện', isGroup: true },
            { id: 'group_giao_luu', name: 'Giao lưu', isGroup: true },
            { id: 'group_cong_dong_viet', name: 'Cộng đồng việt', isGroup: true }
        ];

        let roomHtml = '<h4>Nhóm chat</h4>';
        defaultRooms.forEach(room => {
            const chatListItem = document.createElement('div');
            chatListItem.className = 'chat-list-item';
            chatListItem.dataset.id = room.id;
            chatListItem.dataset.name = room.name;
            chatListItem.dataset.isGroup = 'true';
            chatListItem.innerHTML = `
                <img src="${defaultGroupAvatars[room.id] || `https://i.pravatar.cc/30?u=${room.id}`}" alt="Avatar">
                <div class="lzc_user_info">
                    <span class="lzc_uname">${room.name}</span>
                    <span class="lzc_utime"></span>
                </div>
                <span class="lzc_count_msg"></span>
            `;
            chatList.appendChild(chatListItem);
            updateLastMessageAndUnread(room.id, chatListItem);
        });

        const usersRef = db.ref('users');
        usersRef.on('value', snapshot => {
            // Remove old user list items and headers
            chatList.querySelectorAll('.user-list-item, .user-list-header').forEach(el => el.remove());
            
            // Stop listening to old user refs to prevent memory leaks
            if (window.userPresenceListeners) {
                window.userPresenceListeners.forEach(({ ref, listener }) => ref.off('value', listener));
            }
            window.userPresenceListeners = [];

            let usersContainer = chatList.querySelector('.users-container');
            if (!usersContainer) {
                usersContainer = document.createElement('div');
                usersContainer.className = 'users-container';
                chatList.appendChild(usersContainer);
            }
            usersContainer.innerHTML = '<h4 class="user-list-header">Người dùng</h4>';

            snapshot.forEach(childSnapshot => {
                const user = childSnapshot.val();
                const userId = childSnapshot.key;
                if (userId !== currentUser.uid) {
                    const userItem = document.createElement('div');
                    userItem.className = 'chat-list-item user-list-item';
                    userItem.dataset.id = userId;
                    userItem.dataset.name = user.displayName || user.email;
                    userItem.dataset.isGroup = 'false';
                    userItem.innerHTML = `
                        <div class="avatar-container">
                            <img src="${user.photoURL || 'https://i.pravatar.cc/30'}" alt="Avatar">
                            <span class="status-indicator" id="status-${userId}"></span>
                        </div>
                        <div class="lzc_user_info">
                            <span class="lzc_uname">${user.displayName || user.email}</span>
                            <span class="lzc_utime"></span>
                        </div>
                        <span class="lzc_count_msg"></span>
                    `;
                    usersContainer.appendChild(userItem);

                    const chatId = getPrivateChatId(currentUser.uid, userId);
                    updateLastMessageAndUnread(chatId, userItem);

                    // Attach presence listeners
                    const presenceRef = db.ref(`presence/${userId}`);
                    const listener = presenceRef.on('value', (presenceSnapshot) => {
                        const statusIndicator = document.getElementById(`status-${userId}`);
                        if (statusIndicator) {
                            if (presenceSnapshot.val() === 'online') {
                                statusIndicator.classList.add('online');
                                statusIndicator.classList.remove('offline');
                            } else {
                                statusIndicator.classList.add('offline');
                                statusIndicator.classList.remove('online');
                            }
                        }
                    });
                    window.userPresenceListeners.push({ ref: presenceRef, listener });
                }
            });
        });
    }

    function formatTimeAgo(timestamp) {
        const now = new Date();
        const seconds = Math.floor((now - new Date(timestamp)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " năm trước";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " tháng trước";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " ngày trước";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " giờ trước";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " phút trước";
        return "Vài giây trước";
    }

    function updateLastMessageAndUnread(chatId, chatListItem) {
        const lastMessageRef = db.ref('messages/' + chatId).orderByChild('timestamp').limitToLast(1);
        const unreadRef = db.ref(`unread-counts/${currentUser.uid}/${chatId}`);

        lastMessageRef.on('child_added', (snapshot) => {
            const lastMessage = snapshot.val();
            if (lastMessage && lastMessage.timestamp) {
                const timeAgo = formatTimeAgo(lastMessage.timestamp);
                const timeElement = chatListItem.querySelector('.lzc_utime');
                if (timeElement) {
                    timeElement.textContent = timeAgo;
                }
            }
        });

        unreadRef.on('value', (snapshot) => {
            const unreadCount = snapshot.val() || 0;
            const countElement = chatListItem.querySelector('.lzc_count_msg');
            if (countElement) {
                if (unreadCount > 0) {
                    countElement.textContent = unreadCount;
                    countElement.style.display = 'inline';
                } else {
                    countElement.style.display = 'none';
                }
            }
        });
    }

    async function openChatWindow(chatId, chatName, isGroup) {
        // Reset unread count when opening window
        const unreadRef = db.ref(`unread-counts/${currentUser.uid}/${chatId}`);
        unreadRef.set(0);

        if (openChatWindows.includes(chatId)) {
            const existingWindow = document.getElementById(`chat-window-${chatId}`);
            if (existingWindow) existingWindow.style.display = 'flex';
            return;
        }

        if (openChatWindows.length >= 3) {
            const oldestChatId = openChatWindows.shift();
            const oldestWindow = document.getElementById(`chat-window-${oldestChatId}`);
            if (oldestWindow) oldestWindow.remove();
        }

        const userSettingsRef = db.ref(`user-settings/${currentUser.uid}/chatBackgrounds/${chatId}`);
        const snapshot = await userSettingsRef.get();
        const savedBg = snapshot.val();

        const chatWindow = document.createElement('div');
        chatWindow.id = `chat-window-${chatId}`;
        chatWindow.classList.add('chat-window');
        chatWindow.style.right = `${340 + (openChatWindows.length * 310)}px`;
        chatWindow.innerHTML = `
            <div class="chat-window-header">
                <div class="chat-header-info">
                    <img src="${isGroup ? defaultGroupAvatars[chatId] || `https://i.pravatar.cc/30?u=${chatId}` : (await getUserData(chatId.replace(currentUser.uid, '').replace('_', ''))).photoURL || 'https://i.pravatar.cc/30'}" alt="Avatar" class="chat-avatar" data-uid="${isGroup ? '' : chatId.replace(currentUser.uid, '').replace('_', '')}">
                    <div>
                        <span class="chat-username" data-uid="${isGroup ? '' : chatId.replace(currentUser.uid, '').replace('_', '')}">${chatName}</span>
                        <span class="chat-status"></span>
                    </div>
                </div>
                <div class="chat-header-actions">
                    <button class="chat-settings-btn"><i class="fas fa-cog"></i></button>
                    <button class="close-chat-window"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="chat-window-body" style="background-image: url('${savedBg || 'nen1.png'}');"></div>
            <div class="chat-window-footer">
                <input type="file" class="image-upload" accept="image/*" style="display: none;">
                <button class="chat-action-btn image-upload-btn"><i class="fas fa-image"></i></button>
                <input type="text" placeholder="Nhập tin nhắn...">
                <button class="chat-action-btn emoji-btn"><i class="far fa-smile"></i></button>
                <button class="chat-action-btn like-btn"><i class="far fa-thumbs-up"></i></button>
                <button class="send-btn"><i class="fas fa-paper-plane"></i></button>
            </div>
        `;

        document.body.appendChild(chatWindow);
        openChatWindows.push(chatId);

        chatWindow.querySelector('.close-chat-window').addEventListener('click', () => {
            chatWindow.remove();
            openChatWindows = openChatWindows.filter(id => id !== chatId);
        });

        chatWindow.querySelector('.chat-settings-btn').addEventListener('click', () => {
            openChatSettings(chatWindow, chatId);
        });

        chatWindow.addEventListener('setReplyTo', (e) => {
            replyToMessageId = e.detail.messageId;
            showReplyPreview(chatWindow, e.detail.message);
        });

        const chatAvatar = chatWindow.querySelector('.chat-avatar');
        const chatUsername = chatWindow.querySelector('.chat-username');
        const uid = chatAvatar.dataset.uid;

        if (uid) {
            chatAvatar.addEventListener('click', () => window.open(`wall.html?id=${uid}`, '_blank'));
            chatUsername.addEventListener('click', () => window.open(`wall.html?id=${uid}`, '_blank'));

            const presenceRef = db.ref(`presence/${uid}`);
            const chatStatus = chatWindow.querySelector('.chat-status');

            presenceRef.on('value', (snapshot) => {
                const status = snapshot.val();
                if (status === 'online') {
                    chatStatus.textContent = 'Online';
                    chatStatus.classList.add('online');
                    chatStatus.classList.remove('offline');
                } else {
                    chatStatus.textContent = 'Offline';
                    chatStatus.classList.add('offline');
                    chatStatus.classList.remove('online');
                }
            });
        }

        const imageUploadInput = chatWindow.querySelector('.image-upload');
        const imageUploadBtn = chatWindow.querySelector('.image-upload-btn');

        imageUploadBtn.addEventListener('click', () => imageUploadInput.click());

        imageUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset);

            fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.secure_url) {
                    sendMessage(chatId, `[image]${data.secure_url}`, isGroup);
                } else {
                    console.error('Cloudinary upload failed:', data);
                }
            })
            .catch(error => console.error('Upload failed:', error));
        });

        const messageInput = chatWindow.querySelector('input[type="text"]');
        const sendButton = chatWindow.querySelector('.send-btn');

        const likeButton = chatWindow.querySelector('.like-btn');

        let replyToMessageId = null;

        const sendMessageHandler = () => {
            const messageText = messageInput.value;
            if (messageText.trim()) {
                sendMessage(chatId, messageText, isGroup, replyToMessageId);
                messageInput.value = '';
                replyToMessageId = null;
                hideReplyPreview(chatWindow);
            }
        };

        sendButton.addEventListener('click', sendMessageHandler);
        messageInput.addEventListener('keypress', e => e.key === 'Enter' && sendMessageHandler());

        likeButton.addEventListener('click', () => {
            sendMessage(chatId, '👍', isGroup);
        });

        loadMessages(chatId, chatWindow.querySelector('.chat-window-body'));
    }

    async function sendMessage(chatId, text, isGroup, replyToMessageId) {
        if (!currentUser || !text.trim()) return;

        const userRef = db.ref(`users/${currentUser.uid}`);
        const snapshot = await userRef.get();
        const userData = snapshot.val();

        const messageData = {
            senderId: currentUser.uid,
            senderName: userData.displayName || currentUser.email,
            senderPhotoURL: userData.photoURL, // Use the URL from the database
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };

        if (replyToMessageId) {
            const originalMessageRef = db.ref(`messages/${chatId}/${replyToMessageId}`);
            const originalMessageSnapshot = await originalMessageRef.get();
            const originalMessage = originalMessageSnapshot.val();
            if (originalMessage) {
                messageData.replyTo = {
                    messageId: replyToMessageId,
                    senderId: originalMessage.senderId,
                    senderName: originalMessage.senderName,
                    text: originalMessage.text
                };
            }
        }

        const messagesRef = db.ref(`messages/${chatId}`);
        messagesRef.push(messageData);

        if (!isGroup) {
            const memberIds = chatId.split('_');
            const otherUserId = memberIds.find(id => id !== currentUser.uid);

            // Increment unread count for the other user
            const unreadRef = db.ref(`unread-counts/${otherUserId}/${chatId}`);
            unreadRef.transaction((currentCount) => (currentCount || 0) + 1);

            const userMessagesRef = db.ref(`user-messages/${otherUserId}`);
            userMessagesRef.push({
                chatId: chatId,
                chatName: userData.displayName || currentUser.email, // Also use updated name
                isGroup: false
            });
        }
    }

    function retractMessage(chatId, messageId) {
        const messageRef = db.ref(`messages/${chatId}/${messageId}`);
        messageRef.update({ text: '[retracted]' });
    }

    function showReplyPreview(chatWindow, message) {
        let replyPreview = chatWindow.querySelector('.reply-preview');
        if (!replyPreview) {
            replyPreview = document.createElement('div');
            replyPreview.className = 'reply-preview';
            chatWindow.querySelector('.chat-window-footer').prepend(replyPreview);
        }
        replyPreview.innerHTML = `
            <div class="reply-preview-content">
                <div>Replying to <strong>${message.senderName}</strong></div>
                <div>${message.text}</div>
            </div>
            <button class="close-reply-preview"><i class="fas fa-times"></i></button>
        `;
        replyPreview.style.display = 'flex';

        replyPreview.querySelector('.close-reply-preview').addEventListener('click', () => {
            hideReplyPreview(chatWindow);
        });
    }

    function hideReplyPreview(chatWindow) {
        const replyPreview = chatWindow.querySelector('.reply-preview');
        if (replyPreview) {
            replyPreview.style.display = 'none';
        }
    }

    function loadMessages(chatId, chatBody) {
        const messagesRef = db.ref(`messages/${chatId}`).limitToLast(20);
        messagesRef.on('value', async snapshot => {
            chatBody.innerHTML = '';
            let lastSenderId = null;
            let lastMessageTimestamp = null;

            const messages = snapshot.val() || {};
            const messageIds = Object.keys(messages);

            for (const messageId of messageIds) {
                const msg = messages[messageId];
                msg.id = messageId;
                if (msg.senderId !== currentUser.uid) {
                    msg.senderColor = await getUserChatColor(msg.senderId);
                }
                const isConsecutive = msg.senderId === lastSenderId && (msg.timestamp - lastMessageTimestamp) < 300000;
                appendMessage(chatBody, chatId, msg, isConsecutive);
                lastSenderId = msg.senderId;
                lastMessageTimestamp = msg.timestamp;
            }

            chatBody.scrollTop = chatBody.scrollHeight;

            chatBody.addEventListener('scroll', () => {
                if (chatBody.scrollTop === 0) {
                    loadMoreMessages(chatId, chatBody);
                }
            });
        });
    }

    function loadMoreMessages(chatId, chatBody) {
        const messagesRef = db.ref(`messages/${chatId}`).orderByKey().limitToLast(chatBody.children.length + 20);
        messagesRef.once('value', async snapshot => {
            const oldScrollHeight = chatBody.scrollHeight;
            chatBody.innerHTML = '';
            let lastSenderId = null;
            let lastMessageTimestamp = null;

            const messages = snapshot.val() || {};
            const messageIds = Object.keys(messages);

            for (const messageId of messageIds) {
                const msg = messages[messageId];
                msg.id = messageId;
                if (msg.senderId !== currentUser.uid) {
                    msg.senderColor = await getUserChatColor(msg.senderId);
                }
                const isConsecutive = msg.senderId === lastSenderId && (msg.timestamp - lastMessageTimestamp) < 300000;
                appendMessage(chatBody, chatId, msg, isConsecutive);
                lastSenderId = msg.senderId;
                lastMessageTimestamp = msg.timestamp;
            }

            chatBody.scrollTop = chatBody.scrollHeight - oldScrollHeight;
        });
    }

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    async function getUserChatColor(userId) {
        const colorRef = db.ref(`users/${userId}/chatColor`);
        const snapshot = await colorRef.get();
        let color = snapshot.val();
        if (!color) {
            color = getRandomColor();
            await colorRef.set(color);
        }
        return color;
    }

    function appendMessage(chatBody, chatId, msg, isConsecutive) {
        const messageElement = document.createElement('div');
        const messageSide = msg.senderId === currentUser.uid ? 'sent' : 'received';
        messageElement.classList.add('chat-message', messageSide);
        messageElement.dataset.messageId = msg.id;

        if (isConsecutive) {
            messageElement.classList.add('consecutive');
        }

        const senderPhotoURL = msg.senderPhotoURL || `https://i.pravatar.cc/40?u=${msg.senderId}`;

        const avatarHtml = messageSide === 'received' ? `
            <div class="message-avatar-container">
                ${!isConsecutive ? `<a href="wall.html?id=${msg.senderId}" target="_blank"><img src="${senderPhotoURL}" class="message-avatar" alt="Avatar"></a>` : ''}
            </div>
        ` : '';

        const imageRegex = /\[image\](.*)/;
        const imageMatch = msg.text.match(imageRegex);

        let messageBodyHtml;
        if (imageMatch) {
            const imageUrl = imageMatch[1];
            messageBodyHtml = `<img src="${imageUrl}" alt="Image" style="max-width: 200px; border-radius: 10px; cursor: pointer;" onclick="window.open('${imageUrl}', '_blank')">`;
        } else if (msg.text.startsWith('[retracted]')) {
            messageBodyHtml = `<div class="message-text retracted"><em>Tin nhắn đã được thu hồi</em></div>`;
        } else if (msg.replyTo) {
            messageBodyHtml = `
                <div class="reply-container">
                    <div class="reply-to">Trả lời <strong>${msg.replyTo.senderName}</strong></div>
                    <div class="reply-text">${msg.replyTo.text}</div>
                </div>
                <div class="message-text">${msg.text}</div>
            `;
        } else {
            messageBodyHtml = `<div class="message-text">${msg.text}</div>`;
        }

        const senderNameHtml = messageSide === 'received' && !isConsecutive ? `<div class="message-sender" style="color: ${msg.senderColor || '#000'}"><a href="wall.html?id=${msg.senderId}" target="_blank" style="color: inherit;">${msg.senderName}</a></div>` : '';

        const contentHtml = `
            <div class="message-content">
                ${senderNameHtml}
                ${messageBodyHtml}
                <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div class="message-actions"><i class="fas fa-ellipsis-h"></i></div>
            </div>
        `;

        messageElement.innerHTML = avatarHtml + contentHtml;

        const actions = messageElement.querySelector('.message-actions');

        actions.addEventListener('click', (e) => {
            e.stopPropagation();

            const existingMenus = document.querySelectorAll('.message-context-menu');
            existingMenus.forEach(menu => menu.remove());

            const contextMenu = document.createElement('div');
            contextMenu.className = 'message-context-menu';

            if (messageSide === 'sent') {
                contextMenu.innerHTML = `<div class="context-menu-item retract-btn">Thu hồi</div>`;
                const retractBtn = contextMenu.querySelector('.retract-btn');
                if (retractBtn) {
                    retractBtn.addEventListener('click', () => {
                        retractMessage(chatId, msg.id);
                        contextMenu.remove();
                    });
                }
            } else { 
                contextMenu.innerHTML = `<div class="context-menu-item reply-btn">Trả lời</div>`;
                const replyBtn = contextMenu.querySelector('.reply-btn');
                if (replyBtn) {
                    replyBtn.addEventListener('click', () => {
                        const chatWindow = chatBody.closest('.chat-window');
                        chatWindow.dispatchEvent(new CustomEvent('setReplyTo', {
                            detail: { messageId: msg.id, message: msg }
                        }));
                        contextMenu.remove();
                    });
                }
            }

            messageElement.appendChild(contextMenu);

            const closeMenuOnClickOutside = (event) => {
                if (!contextMenu.contains(event.target)) {
                    contextMenu.remove();
                    document.removeEventListener('click', closeMenuOnClickOutside);
                }
            };
            setTimeout(() => { 
                document.addEventListener('click', closeMenuOnClickOutside);
            }, 0);
        });

        chatBody.appendChild(messageElement);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function listenForNewMessages() {
        if (!currentUser) return;
        const userMessagesRef = db.ref('user-messages/' + currentUser.uid);
        userMessagesRef.on('child_added', snapshot => {
            const messageData = snapshot.val();
            const chatId = messageData.chatId;
            const chatName = messageData.chatName;
            const isGroup = messageData.isGroup;

            if (!openChatWindows.includes(chatId)) {
                // The new message indicator is now handled by updateLastMessageAndUnread
            }

            openChatWindow(chatId, chatName, isGroup);
            userMessagesRef.child(snapshot.key).remove();
        });
    }

    function openChatSettings(chatWidget, chatId) {
        let settingsView = chatWidget.querySelector('.chat-settings-view');
        if (settingsView) {
            settingsView.remove();
            return;
        }

        settingsView = document.createElement('div');
        settingsView.className = 'chat-settings-view';
        settingsView.innerHTML = `
            <h5>Cài đặt chat</h5>
            <div class="form-group">
                <label for="chat-bg-select-${chatId}">Chọn ảnh nền:</label>
                <select id="chat-bg-select-${chatId}">
                    <option value="nen1.png">Mặc định</option>
                    <option value="nen2.png">Nền 2</option>
                    <option value="nen3.png">Nền 3</option>
                    <option value="nen4.png">Nền 4</option>
                </select>
            </div>
            <div class="form-group">
                <label for="chat-bg-upload-${chatId}">Hoặc tải ảnh lên:</label>
                <input type="file" id="chat-bg-upload-${chatId}" accept="image/*">
            </div>
        `;

        chatWidget.appendChild(settingsView);

        const chatBody = chatWidget.querySelector('.chat-window-body');
        const userSettingsRef = db.ref(`user-settings/${currentUser.uid}/chatBackgrounds/${chatId}`);

        document.getElementById(`chat-bg-select-${chatId}`).addEventListener('change', (e) => {
            const bgUrl = e.target.value;
            chatBody.style.backgroundImage = `url('${bgUrl}')`;
            userSettingsRef.set(bgUrl);
        });

        document.getElementById(`chat-bg-upload-${chatId}`).addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const bgUrl = event.target.result;
                chatBody.style.backgroundImage = `url('${bgUrl}')`;
                userSettingsRef.set(bgUrl);
            };
            reader.readAsDataURL(file);
        });
    }
});