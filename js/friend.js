document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const db = firebase.database();

    const friendRequestsList = document.getElementById('friend-requests-list');
    const friendsList = document.getElementById('friends-list');
    const followingList = document.getElementById('following-list');
    const followersList = document.getElementById('followers-list');

    auth.onAuthStateChanged(user => {
        if (user) {
            loadFriendRequests(user.uid);
            loadFriends(user.uid);
            loadFollowing(user.uid);
            loadFollowers(user.uid);
            setupTabs();
        } else {
            window.location.href = 'login.html';
        }
    });

    function setupTabs() {
        const menuIcon = document.querySelector('.menu-icon');
        const tabsContainer = document.querySelector('.tabs');
        const tabs = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');

        menuIcon.addEventListener('click', () => {
            tabsContainer.classList.toggle('active');
        });

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;

                // Hide menu on mobile after selection
                if (window.innerWidth <= 768) {
                    tabsContainer.classList.remove('active');
                }

                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    function loadFriendRequests(userId) {
        const requestsRef = db.ref(`friend_requests/${userId}`);
        requestsRef.on('value', snapshot => {
            friendRequestsList.innerHTML = '';
            if (snapshot.exists()) {
                snapshot.forEach(requestSnap => {
                    const request = requestSnap.val();
                    const fromId = request.from;
                    db.ref(`users/${fromId}`).once('value', userSnap => {
                        const userData = userSnap.val();
                        if (userData) {
                            const requestElement = createUserItemElement(fromId, userData, 'request');
                            friendRequestsList.appendChild(requestElement);
                        }
                    });
                });
            } else {
                friendRequestsList.innerHTML = '<p>Không có lời mời kết bạn nào.</p>';
            }
        });
    }

    function loadFriends(userId) {
        const friendsRef = db.ref(`users/${userId}/friends`);
        friendsRef.on('value', snapshot => {
            friendsList.innerHTML = '';
            if (snapshot.exists()) {
                snapshot.forEach(friendSnap => {
                    const friendId = friendSnap.key;
                    db.ref(`users/${friendId}`).once('value', userSnap => {
                        const userData = userSnap.val();
                        if (userData) {
                            const friendElement = createUserItemElement(friendId, userData, 'friend');
                            friendsList.appendChild(friendElement);
                        }
                    });
                });
            } else {
                friendsList.innerHTML = '<p>Chưa có bạn bè nào.</p>';
            }
        });
    }

    function loadFollowing(userId) {
        const followingRef = db.ref(`users/${userId}/following`);
        followingRef.on('value', snapshot => {
            followingList.innerHTML = '';
            if (snapshot.exists()) {
                snapshot.forEach(followingSnap => {
                    const followingId = followingSnap.key;
                    db.ref(`users/${followingId}`).once('value', userSnap => {
                        const userData = userSnap.val();
                        if (userData) {
                            const followingElement = createUserItemElement(followingId, userData, 'following');
                            followingList.appendChild(followingElement);
                        }
                    });
                });
            } else {
                followingList.innerHTML = '<p>Bạn chưa theo dõi ai.</p>';
            }
        });
    }

    function loadFollowers(userId) {
        const followersRef = db.ref(`users/${userId}/followers`);
        followersRef.on('value', snapshot => {
            followersList.innerHTML = '';
            if (snapshot.exists()) {
                snapshot.forEach(followerSnap => {
                    const followerId = followerSnap.key;
                    db.ref(`users/${followerId}`).once('value', userSnap => {
                        const userData = userSnap.val();
                        if (userData) {
                            const followerElement = createUserItemElement(followerId, userData, 'follower');
                            followersList.appendChild(followerElement);
                        }
                    });
                });
            } else {
                followersList.innerHTML = '<p>Bạn chưa có người theo dõi nào.</p>';
            }
        });
    }

    function createUserItemElement(userId, userData, type) {
        const itemElement = document.createElement('div');
        itemElement.classList.add('user-item');

        let actionsHTML = '';
        if (type === 'request') {
            actionsHTML = `
                <div class="user-actions">
                    <button class="accept-btn" data-id="${userId}">Chấp nhận</button>
                    <button class="reject-btn" data-id="${userId}">Từ chối</button>
                </div>
            `;
        }

        itemElement.innerHTML = `
            <img src="${userData.photoURL || 'https://via.placeholder.com/50'}" alt="Avatar">
            <div class="user-info">
                <a href="wall.html?id=${userId}">${userData.displayName}</a>
            </div>
            ${actionsHTML}
        `;

        if (type === 'request') {
            itemElement.querySelector('.accept-btn').addEventListener('click', (e) => {
                acceptFriendRequest(auth.currentUser.uid, e.target.dataset.id);
            });
            itemElement.querySelector('.reject-btn').addEventListener('click', (e) => {
                rejectFriendRequest(auth.currentUser.uid, e.target.dataset.id);
            });
        }

        return itemElement;
    }

    function acceptFriendRequest(currentUserId, requestingUserId) {
        const updates = {};
        updates[`/users/${currentUserId}/friends/${requestingUserId}`] = true;
        updates[`/users/${requestingUserId}/friends/${currentUserId}`] = true;
        updates[`/friend_requests/${currentUserId}/${requestingUserId}`] = null;
        db.ref().update(updates).then(() => {
            // Optional: Add notification for accepted request
        });
    }

    function rejectFriendRequest(currentUserId, requestingUserId) {
        db.ref(`friend_requests/${currentUserId}/${requestingUserId}`).remove();
    }
});