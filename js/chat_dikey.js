document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = `
        .chat-list-item {
            position: relative;
        }

        .group-info-btn {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            opacity: 0.5;
            cursor: pointer;
        }

        .group-info-body {
            padding: 10px;
        }
        .group-info-body button {
            display: block;
            width: 100%;
            padding: 10px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            background-color: #f0f0f0;
            cursor: pointer;
            text-align: left;
        }

        .member-list {
            max-height: 150px;
            overflow-y: auto;
        }

        .member-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 5px 0;
        }

        .remove-member-btn {
            background-color: #ff4d4d;
            color: white;
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
        }
    `;

    // Thêm CSS cho chế độ điện thoại
    if (window.innerWidth <= 768) {
        style.textContent += `
            .sub-header {
                background-color: #fff;
                padding: 10px;
                text-align: center;
                border-bottom: 1px solid #ddd;
            }

            #open-chat-mobile-btn {
                background-color: #1877f2;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            }

            .chat-widget {
                display: none; /* Hide by default on mobile */
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2000;
                flex-direction: column;
                background-color: #fff; /* Add background for the full-screen widget */
            }

            .chat-widget.mobile-open {
                display: flex !important; /* Show when open */
            }

         .chat-list-container {
                height: 100%;
                flex-grow: 1;
                overflow-y: auto;
            }
            .chat-header {
                flex-shrink: 0;
            }

            .chat-window {
                width: 100% !important;
                height: 100% !important;
                bottom: 0 !important;
                right: 0 !important;
                position: fixed !important;
                z-index: 2001 !important;
            }
        `;
    }
    document.head.appendChild(style);

    document.body.addEventListener('click', event => {
        if (event.target.matches('#open-chat-mobile-btn')) {
            const chatWidget = document.querySelector('.chat-widget');
            const chatListContainer = document.querySelector('.chat-list-container');
            if (chatWidget) {
                chatWidget.classList.add('mobile-open');
            }
            if (chatListContainer) {
                chatListContainer.classList.add('open');
            }
        }
    });

    let currentUser;
    let openChatWindows = [];
    let chatList;

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

            if (window.innerWidth <= 768) {
                const mainHeader = document.querySelector('header');
                if (mainHeader) {
                    const subHeader = document.createElement('div');
                    subHeader.className = 'sub-header';
                    subHeader.innerHTML = '<button id="open-chat-mobile-btn">Mở Chat</button>';
                    mainHeader.insertAdjacentElement('afterend', subHeader);

                    document.getElementById('open-chat-mobile-btn').addEventListener('click', () => {
                        const chatWidget = document.querySelector('.chat-widget');
                        if (chatWidget) {
                            chatWidget.classList.add('mobile-open');
                        }
                    });
                }
            }

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
                            <button id="create-group-chat" title="Tạo nhóm chat"><i class="fas fa-users"></i></button>
                        </div>
                        <div id="chat-list">
                            <div class="default-rooms-container"></div>
                            <div class="private-groups-container"></div>
                            <div class="users-container"></div>
                        </div>
                    </div>
                </div>
            `;

            chatList = document.getElementById('chat-list');

            const chatHeader = document.querySelector('.chat-header');
            const toggleButton = document.getElementById('toggle-chat-list');
            const chatListContainer = document.querySelector('.chat-list-container');

            chatHeader.addEventListener('click', () => {
                const chatWidget = document.querySelector('.chat-widget');
                if (window.innerWidth <= 768) {
                    // On mobile, the header click should not close the widget.
                    // Let the dedicated close button handle that.
                    // This click will toggle the list visibility on desktop.
                } else {
                    chatListContainer.classList.toggle('open');
                    toggleButton.querySelector('i').classList.toggle('fa-chevron-up');
                    toggleButton.querySelector('i').classList.toggle('fa-chevron-down');
                }
            });

            const closeWidgetButton = document.getElementById('close-chat-widget');
            const chatWidget = document.querySelector('.chat-widget');

            closeWidgetButton.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    chatWidget.classList.remove('mobile-open');
                } else {
                    chatWidget.style.display = 'none';
                }
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

            document.getElementById('create-group-chat').addEventListener('click', () => {
                openGroupCreationWindow();
            });

            loadChatList();
            listenForNewMessages();
        } else {
            currentUser = null;
            chatContainer.innerHTML = '';
            openChatWindows = [];
        }
    });

    function openGroupCreationWindow() {
        const groupCreationWindow = document.createElement('div');
        groupCreationWindow.className = 'chat-window';
        groupCreationWindow.style.display = 'block';
        groupCreationWindow.innerHTML = `
            <div class="chat-header">
                <span>Tạo nhóm mới</span>
                <button class="close-chat-window"><i class="fas fa-times"></i></button>
            </div>
            <div class="chat-messages"></div>
            <div class="chat-input">
                <input type="text" id="group-name-input" placeholder="Nhập tên nhóm...">
                <input type="file" id="group-avatar-input" accept="image/*">
                <div id="user-selection-list"></div>
                <button id="create-group-button">Tạo nhóm</button>
            </div>
        `;
        document.body.appendChild(groupCreationWindow);

        const userSelectionList = groupCreationWindow.querySelector('#user-selection-list');


        const usersRef = db.ref('users');
        usersRef.once('value', snapshot => {
            snapshot.forEach(childSnapshot => {
                const user = childSnapshot.val();
                const userId = childSnapshot.key;
                if (userId !== currentUser.uid) {
                    const userElement = document.createElement('div');
                    userElement.innerHTML = `
                        <input type="checkbox" id="${userId}" value="${userId}">
                        <label for="${userId}">${user.displayName || user.email}</label>
                    `;
                    userSelectionList.appendChild(userElement);
                }
            });
        });

        groupCreationWindow.querySelector('.close-chat-window').addEventListener('click', () => {
            groupCreationWindow.remove();
        });

        groupCreationWindow.querySelector('#create-group-button').addEventListener('click', async () => {
            const groupName = document.getElementById('group-name-input').value;
            const selectedUsers = Array.from(userSelectionList.querySelectorAll('input:checked')).map(input => input.value);
            const avatarFile = document.getElementById('group-avatar-input').files[0];

            if (groupName && selectedUsers.length > 0) {
                let avatarUrl = '';
                if (avatarFile) {
                    avatarUrl = await uploadToCloudinary(avatarFile);
                }

                selectedUsers.push(currentUser.uid);
                createGroupChat(groupName, selectedUsers, avatarUrl);
                groupCreationWindow.remove();
            }
        });
    }

    async function uploadToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        return data.secure_url;
    }

    function createGroupChat(groupName, members, avatarUrl) {
        const newGroupRef = db.ref('groups').push();
        const groupId = newGroupRef.key;

        const membersObject = {};
        members.forEach(memberId => {
            membersObject[memberId] = true;
        });

        newGroupRef.set({
            name: groupName,
            members: membersObject,
            avatar: avatarUrl,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: currentUser.uid
        });

        // Add the group to each member's chat list
        members.forEach(memberId => {
            db.ref(`users/${memberId}/groups/${groupId}`).set(true);
        });

        openChatWindow({
            id: groupId,
            name: groupName,
            isGroup: true,
            avatarUrl: avatarUrl
        });

        // Manually add the new group to the chat list
        const privateGroupsContainer = document.querySelector('.private-groups-container');
        if (privateGroupsContainer) {
            if (privateGroupsContainer.children.length === 0) {
                privateGroupsContainer.innerHTML = '<h4 class="user-list-header"</h4>';
            }
            const group = {
                name: groupName,
                avatar: avatarUrl,
                createdBy: currentUser.uid
            };
            const chatListItem = document.createElement('div');
            chatListItem.className = 'chat-list-item';
            chatListItem.dataset.id = groupId;
            chatListItem.dataset.name = group.name;
            chatListItem.dataset.isGroup = 'true';
            chatListItem.dataset.avatar = group.avatar || ''; // Store avatar URL
            chatListItem.innerHTML = `
                <img src="${group.avatar || 'https://i.pravatar.cc/30?u=' + groupId}" alt="Avatar">
                <div class="lzc_user_info">
                    <span class="lzc_uname">${group.name}</span>
                    <span class="lzc_utime"></span>
                </div>
                <span class="lzc_count_msg"></span>
                <span class="group-info-btn"><i class="fas fa-info-circle"></i></span>
            `;
            
            const groupInfoBtn = chatListItem.querySelector('.group-info-btn');
            groupInfoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openGroupInfoModal(groupId, group.name, group.createdBy);
            });
            privateGroupsContainer.appendChild(chatListItem);
            updateLastMessageAndUnread(groupId, chatListItem);
            window.renderedUsers[groupId] = chatListItem;
        }
    }

    function getPrivateChatId(userId1, userId2) {
        return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
    }

    async function getUserData(userId) {
        const userRef = db.ref(`users/${userId}`);
        const snapshot = await userRef.get();
        return snapshot.val() || {};
    }

    function loadChatList() {
        if (!chatList) return;

        // Use an object to keep track of rendered users
        if (!window.renderedUsers) {
            window.renderedUsers = {};
        }

        // Event delegation for chat list items
        if (!chatList.dataset.listenerAttached) {
            chatList.addEventListener('click', (e) => {
                const item = e.target.closest('.chat-list-item');
                if (item) {
                    const targetId = item.dataset.id;
                    const chatName = item.dataset.name;
                    const isGroup = item.dataset.isGroup === 'true';
                    const avatarUrl = item.dataset.avatar;
                    const chatId = isGroup ? targetId : getPrivateChatId(currentUser.uid, targetId);
                    openChatWindow({ id: chatId, name: chatName, isGroup, avatarUrl });
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

        const defaultRoomsContainer = chatList.querySelector('.default-rooms-container');
        const privateGroupsContainer = chatList.querySelector('.private-groups-container');
        const usersContainer = chatList.querySelector('.users-container');

        // Load default rooms
        if (defaultRoomsContainer.children.length === 0) {
            defaultRoomsContainer.innerHTML = '<h4>Nhóm chat</h4>';
            defaultRooms.forEach(room => {
                if (!window.renderedUsers[room.id]) {
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
                    defaultRoomsContainer.appendChild(chatListItem);
                    updateLastMessageAndUnread(room.id, chatListItem);
                    window.renderedUsers[room.id] = chatListItem;
                }
            });
        }



        // Load private groups
        const userGroupsRef = db.ref(`users/${currentUser.uid}/groups`);
        userGroupsRef.once('value', snapshot => {
            snapshot.forEach(childSnapshot => {
                const groupId = childSnapshot.key;
                const groupRef = db.ref(`groups/${groupId}`);
                groupRef.once('value', groupSnapshot => {
                    const group = groupSnapshot.val();
                    if (group && !window.renderedUsers[groupId]) {
                        if (privateGroupsContainer.children.length === 0) {
                            privateGroupsContainer.innerHTML = '<h4 class="user-list-header">Nhóm chat riêng</h4>';
                        }

                        const chatListItem = document.createElement('div');
                        chatListItem.className = 'chat-list-item';
                        chatListItem.dataset.id = groupId;
                        chatListItem.dataset.name = group.name;
                        chatListItem.dataset.isGroup = 'true';
                        chatListItem.dataset.avatar = group.avatar || ''; // Store avatar URL
                        chatListItem.innerHTML = `
                            <img src="${group.avatar || 'https://i.pravatar.cc/30?u=' + groupId}" alt="Avatar">
                            <div class="lzc_user_info">
                                <span class="lzc_uname">${group.name}</span>
                                <span class="lzc_utime"></span>
                            </div>
                            <span class="lzc_count_msg"></span>
                            <span class="group-info-btn"><i class="fas fa-info-circle"></i></span>
                        `;

                        const groupInfoBtn = chatListItem.querySelector('.group-info-btn');
                        groupInfoBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            openGroupInfoModal(groupId, group.name, group.createdBy);
                        });
                        privateGroupsContainer.appendChild(chatListItem);
                        updateLastMessageAndUnread(groupId, chatListItem);
                        window.renderedUsers[groupId] = chatListItem;
                    }
                });
            });
        });

        // Load users
        const usersRef = db.ref('users');
        usersRef.on('child_added', snapshot => {
            const user = snapshot.val();
            const userId = snapshot.key;

            if (userId !== currentUser.uid && !window.renderedUsers[userId]) {
                if (usersContainer.children.length === 0) {
                    usersContainer.innerHTML = '<h4 class="user-list-header">Người dùng</h4>';
                }

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
                window.renderedUsers[userId] = userItem;

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
                if (!window.userPresenceListeners) {
                    window.userPresenceListeners = [];
                }
                window.userPresenceListeners.push({ ref: presenceRef, listener });
            }
        });

        usersRef.on('child_changed', snapshot => {
            const user = snapshot.val();
            const userId = snapshot.key;
            const userItem = window.renderedUsers[userId];
            if (userItem) {
                userItem.dataset.name = user.displayName || user.email;
                userItem.querySelector('.lzc_uname').textContent = user.displayName || user.email;
                userItem.querySelector('img').src = user.photoURL || 'https://i.pravatar.cc/30';
            }
        });

        usersRef.on('child_removed', snapshot => {
            const userId = snapshot.key;
            const userItem = window.renderedUsers[userId];
            if (userItem) {
                userItem.remove();
                delete window.renderedUsers[userId];
            }
        });
    }

    async function openGroupInfoModal(groupId, groupName, createdBy) {
        const isCreator = currentUser.uid === createdBy;

        const existingWindow = document.querySelector('.group-info-window');
        if (existingWindow) {
            existingWindow.remove();
        }

        const infoWindow = document.createElement('div');
        infoWindow.className = 'chat-window group-info-window';
        infoWindow.style.display = 'block';
        infoWindow.style.right = '340px';
        infoWindow.style.zIndex = '1001';

        const groupRef = db.ref(`groups/${groupId}`);
        const groupSnapshot = await groupRef.once('value');
        const group = groupSnapshot.val();
        const members = group.members ? Object.keys(group.members) : [];

        const creatorData = await getUserData(createdBy);
        const creatorName = creatorData.displayName || creatorData.email;

        let membersHtml = '';
        for (const memberId of members) {
            const memberData = await getUserData(memberId);
            const memberName = memberData.displayName || memberData.email;
            membersHtml += `
                <div class="member-item">
                    <span>${memberName}</span>
                    ${isCreator && memberId !== currentUser.uid ? `<button class="remove-member-btn" data-member-id="${memberId}">Xóa</button>` : ''}
                </div>
            `;
        }

        let buttonsHtml = '';
        if (isCreator) {
            buttonsHtml = `
                <button id="add-member-btn" style="color: black;">Thêm thành viên</button>
                <button id="rename-group-btn" style="color: black;">Đổi tên nhóm</button>
                <button id="dissolve-group-btn" style="color: black;">Giải tán nhóm</button>
            `;
        } else {
            buttonsHtml = `
                <button id="add-member-btn">Thêm người</button>
                <button id="leave-group-btn">Rời nhóm</button>
            `;
        }

        infoWindow.innerHTML = `
            <div class="chat-header">
                <span>Thông tin nhóm: ${groupName}</span>
                <button class="close-chat-window"><i class="fas fa-times"></i></button>
            </div>
            <div class="group-info-body" style="color: black;">
                <p><strong>Người tạo:</strong> ${creatorName}</p>
                <p><strong>Số lượng thành viên:</strong> ${members.length}</p>
                <button id="toggle-members-btn" style="color: black;">Xem thành viên</button>
                <hr>
                <div class="member-list" style="display: none;">
                    <h5>Thành viên</h5>
                    ${membersHtml}
                </div>
                <hr>
                ${buttonsHtml}
            </div>
        `;

        document.body.appendChild(infoWindow);

        infoWindow.querySelector('#toggle-members-btn').addEventListener('click', () => {
            const memberList = infoWindow.querySelector('.member-list');
            memberList.style.display = memberList.style.display === 'none' ? 'block' : 'none';
        });

        infoWindow.querySelector('.close-chat-window').addEventListener('click', () => {
            infoWindow.remove();
        });

        infoWindow.querySelectorAll('.remove-member-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const memberId = e.target.dataset.memberId;
                if (confirm('Bạn có chắc chắn muốn xóa thành viên này khỏi nhóm không?')) {
                    db.ref(`groups/${groupId}/members/${memberId}`).remove();
                    db.ref(`users/${memberId}/groups/${groupId}`).remove();
                    openGroupInfoModal(groupId, groupName, createdBy); // Refresh the modal
                }
            });
        });

        if (isCreator) {
            infoWindow.querySelector('#add-member-btn').addEventListener('click', () => {
                openUserSelectionModal(groupId);
                infoWindow.remove();
            });

            infoWindow.querySelector('#rename-group-btn').addEventListener('click', () => {
                const newName = prompt('Nhập tên nhóm mới:');
                if (newName) {
                    db.ref(`groups/${groupId}/name`).set(newName);
                }
                infoWindow.remove();
            });

            infoWindow.querySelector('#dissolve-group-btn').addEventListener('click', () => {
                if (confirm('Bạn có chắc chắn muốn giải tán nhóm này không?')) {
                    db.ref(`groups/${groupId}`).remove();
                    db.ref(`users`).orderByChild(`groups/${groupId}`).equalTo(true).once('value', snapshot => {
                        snapshot.forEach(childSnapshot => {
                            db.ref(`users/${childSnapshot.key}/groups/${groupId}`).remove();
                        });
                    });
                }
                infoWindow.remove();
            });
        } else {
            infoWindow.querySelector('#add-member-btn').addEventListener('click', () => {
                openUserSelectionModal(groupId);
                infoWindow.remove();
            });

            infoWindow.querySelector('#leave-group-btn').addEventListener('click', () => {
                if (confirm('Bạn có chắc chắn muốn rời khỏi nhóm này không?')) {
                    db.ref(`groups/${groupId}/members/${currentUser.uid}`).remove();
                    db.ref(`users/${currentUser.uid}/groups/${groupId}`).remove();
                }
                infoWindow.remove();
            });
        }
    }

    function openUserSelectionModal(groupId) {
        const userSelectionWindow = document.createElement('div');
        userSelectionWindow.className = 'chat-window';
        userSelectionWindow.style.display = 'block';
        userSelectionWindow.innerHTML = `
            <div class="chat-header">
                <span>Thêm thành viên</span>
                <button class="close-chat-window"><i class="fas fa-times"></i></button>
            </div>
            <div id="user-selection-list"></div>
            <button id="add-selected-users-btn">Thêm</button>
        `;
        document.body.appendChild(userSelectionWindow);

        const userSelectionList = userSelectionWindow.querySelector('#user-selection-list');

        const usersRef = db.ref('users');
        usersRef.once('value', snapshot => {
            snapshot.forEach(childSnapshot => {
                const user = childSnapshot.val();
                const userId = childSnapshot.key;
                if (userId !== currentUser.uid) {
                    const userElement = document.createElement('div');
                    userElement.innerHTML = `
                        <input type="checkbox" id="${userId}" value="${userId}">
                        <label for="${userId}">${user.displayName || user.email}</label>
                    `;
                    userSelectionList.appendChild(userElement);
                }
            });
        });

        userSelectionWindow.querySelector('.close-chat-window').addEventListener('click', () => {
            userSelectionWindow.remove();
        });

        userSelectionWindow.querySelector('#add-selected-users-btn').addEventListener('click', () => {
            const selectedUsers = Array.from(userSelectionList.querySelectorAll('input:checked')).map(input => input.value);
            if (selectedUsers.length > 0) {
                const groupMembersRef = db.ref(`groups/${groupId}/members`);
                selectedUsers.forEach(userId => {
                    groupMembersRef.child(userId).set(true);
                    db.ref(`users/${userId}/groups/${groupId}`).set(true);
                });
                userSelectionWindow.remove();
            }
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

    async function openChatWindow(options) {
        const { id: chatId, name: chatName, isGroup, avatarUrl } = options;
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
                    <img src="${isGroup ? avatarUrl || defaultGroupAvatars[chatId] || `https://i.pravatar.cc/30?u=${chatId}` : (await getUserData(chatId.replace(currentUser.uid, '').replace('_', ''))).photoURL || 'https://i.pravatar.cc/30'}" alt="Avatar" class="chat-avatar" data-uid="${isGroup ? '' : chatId.replace(currentUser.uid, '').replace('_', '')}">
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
        let initialLoad = true;

        messagesRef.on('child_added', async snapshot => {
            if (initialLoad) return; // Skip initial data dump

            const msg = snapshot.val();
            msg.id = snapshot.key;
            if (msg.senderId !== currentUser.uid) {
                msg.senderColor = await getUserChatColor(msg.senderId);
            }

            const lastMessageElement = chatBody.lastElementChild;
            let lastSenderId = null;
            let lastMessageTimestamp = null;

            if (lastMessageElement && lastMessageElement.dataset.senderId) {
                lastSenderId = lastMessageElement.dataset.senderId;
                lastMessageTimestamp = parseInt(lastMessageElement.dataset.timestamp, 10);
            }

            const isConsecutive = msg.senderId === lastSenderId && (msg.timestamp - lastMessageTimestamp) < 300000;
            appendMessage(chatBody, chatId, msg, isConsecutive);
        });

        messagesRef.once('value', async snapshot => {
            chatBody.innerHTML = ''; // Clear only on initial load
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
            initialLoad = false;
            chatBody.scrollTop = chatBody.scrollHeight;

            chatBody.addEventListener('scroll', () => {
                if (chatBody.scrollTop === 0) {
                    loadMoreMessages(chatId, chatBody);
                }
            });
        });
    }

    function loadMoreMessages(chatId, chatBody) {
        const firstMessageId = chatBody.firstElementChild.dataset.messageId;
        const messagesRef = db.ref(`messages/${chatId}`).orderByKey().endAt(firstMessageId).limitToLast(21); // Get 20 more + the last one we have

        messagesRef.once('value', async snapshot => {
            const oldScrollHeight = chatBody.scrollHeight;
            const messages = snapshot.val() || {};
            const messageIds = Object.keys(messages).sort();
            messageIds.pop(); // Remove the last message, which we already have

            let firstNewMessageElement = null;

            for (let i = messageIds.length - 1; i >= 0; i--) {
                const messageId = messageIds[i];
                const msg = messages[messageId];
                msg.id = messageId;
                if (msg.senderId !== currentUser.uid) {
                    msg.senderColor = await getUserChatColor(msg.senderId);
                }

                const nextMessageElement = chatBody.firstElementChild;
                let nextSenderId = null;
                let nextMessageTimestamp = null;
                if (nextMessageElement && nextMessageElement.dataset.senderId) {
                    nextSenderId = nextMessageElement.dataset.senderId;
                    nextMessageTimestamp = parseInt(nextMessageElement.dataset.timestamp, 10);
                }

                const isConsecutiveWithNext = msg.senderId === nextSenderId && (nextMessageTimestamp - msg.timestamp) < 300000;
                if (nextMessageElement && isConsecutiveWithNext) {
                    nextMessageElement.classList.add('consecutive');
                    const avatar = nextMessageElement.querySelector('.message-avatar');
                    if (avatar) avatar.style.display = 'none';
                     const senderName = nextMessageElement.querySelector('.message-sender');
                    if(senderName) senderName.style.display = 'none';
                }


                const newMessageElement = prependMessage(chatBody, chatId, msg, false); // We'll handle consecutive logic separately
                if (!firstNewMessageElement) {
                    firstNewMessageElement = newMessageElement;
                }
            }


            if (firstNewMessageElement) {
                 chatBody.scrollTop = firstNewMessageElement.offsetTop;
            }
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
        messageElement.dataset.senderId = msg.senderId;
        messageElement.dataset.timestamp = msg.timestamp;


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

    function prependMessage(chatBody, chatId, msg, isConsecutive) {
        const messageElement = document.createElement('div');
        const messageSide = msg.senderId === currentUser.uid ? 'sent' : 'received';
        messageElement.classList.add('chat-message', messageSide);
        messageElement.dataset.messageId = msg.id;
        messageElement.dataset.senderId = msg.senderId;
        messageElement.dataset.timestamp = msg.timestamp;


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

        chatBody.prepend(messageElement);
        return messageElement;
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