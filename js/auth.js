document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.getElementById("nav-links");

    auth.onAuthStateChanged((user) => {
        if (user) {
            const userRef = db.ref('users/' + user.uid);
            const defaultPhotoURL = `https://i.pravatar.cc/40?u=${user.uid}`;

            // Luôn cập nhật hồ sơ người dùng trong cơ sở dữ liệu với thông tin mới nhất từ nhà cung cấp xác thực
            userRef.update({
                displayName: user.displayName,
                username: user.displayName || user.email.split('@')[0],
                email: user.email,
                photoURL: user.photoURL || defaultPhotoURL
            });

            // Daily login bonus
            userRef.once('value').then((snapshot) => {
                const userData = snapshot.val() || {};
                const updates = {};

                // Initialize game stats if they don't exist
                if (typeof userData.xu === 'undefined') {
                    updates.xu = 0;
                }
                if (typeof userData.power === 'undefined') {
                    updates.power = 10;
                }
                if (typeof userData.health === 'undefined') {
                    updates.health = 100;
                }
                if (typeof userData.defense === 'undefined') {
                    updates.defense = 5;
                }

                // Daily login bonus
                const lastLogin = userData.lastLogin;
                const today = new Date().toDateString();
                const lastLoginDate = lastLogin ? new Date(lastLogin).toDateString() : null;

                let currentXu = userData.xu || updates.xu || 0;

                if (lastLoginDate !== today) {
                    updates.lastLogin = firebase.database.ServerValue.TIMESTAMP;
                    updates.xu = currentXu + 100;
                    userRef.update(updates).then(() => {
                        const notificationRef = db.ref(`notifications/${user.uid}`).push();
                        notificationRef.set({
                            senderId: 'system',
                            type: 'bonus',
                            message: 'Bạn đã nhận được 100 xu thưởng đăng nhập hàng ngày.',
                            link: `wall.html?id=${user.uid}`,
                            timestamp: firebase.database.ServerValue.TIMESTAMP,
                            read: false
                        });
                    });
                } else {
                    updates.lastLogin = firebase.database.ServerValue.TIMESTAMP;
                    userRef.update(updates);
                }
            });

            const displayName = user.displayName || user.email.split('@')[0];
            const photoURL = user.photoURL || defaultPhotoURL;

            if (navLinks) {
                navLinks.innerHTML = `
                    <form class="search-form" id="search-form">
                        <input type="text" id="search-input" placeholder="Tìm kiếm...">
                        <button type="submit"><i class="fas fa-search"></i></button>
                    </form>
                    <a href="post.html" class="btn">Đăng bài</a>
                    <div class="notification-icon" id="notification-icon">
                        <i class="fas fa-bell"></i>
                        <span class="notification-count" id="notification-count" style="display: none;">0</span>
                    </div>
                    <div class="nav-user-profile">
                        <img src="${photoURL}" alt="Avatar" class="nav-avatar">
                        <span class="nav-user-name">${displayName}</span>
                        <div class="dropdown-content">
                           
                            <a href="wall.html?uid=${user.uid}">Trang cá nhân</a>
                            
                            <a href="edit-profile.html">Hồ sơ</a>
                            <a href="quiz-list.html">Trắc nghiệm</a>
                             <a href="dikeygo.html">Chia sẻ hằng ngày</a>
                              <a href="shop.html">Quà ảo</a>
                               <a href="budget.html">Ngân sách</a>
                            <a href="buy-elixir.html">Mua Linh Đan</a>
                    <a href="cultivate-elixir.html">Luyện Linh Đan</a>

                               <a href="#" id="logout-button">Đăng xuất</a>
                        </div>
                    </div>
                `;

                document.getElementById('search-form').addEventListener('submit', function(event) {
                    event.preventDefault();
                    const query = document.getElementById('search-input').value;
                    if (query) {
                        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                    }
                });

                // Thêm cấu trúc modal vào body
                const modalHtml = `
                    <div id="notification-modal" class="notification-modal">
                        <div class="notification-modal-content">
                            <div class="notification-modal-header">
                                <h2>Thông báo</h2>
                                <span class="close-notification-modal">&times;</span>
                            </div>
                            <div id="notification-modal-body" class="notification-modal-body"></div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHtml);

                document.getElementById('logout-button').addEventListener('click', () => {
                    auth.signOut().then(() => {
                        window.location.href = 'login.html';
                    });
                });

                const notificationIcon = document.getElementById('notification-icon');
                const notificationModal = document.getElementById('notification-modal');
                const closeModal = document.querySelector('.close-notification-modal');

                notificationIcon.addEventListener('click', () => {
                    notificationModal.style.display = 'block';
                    markNotificationsAsRead(user.uid);
                });

                closeModal.addEventListener('click', () => {
                    notificationModal.style.display = 'none';
                });

                window.addEventListener('click', (event) => {
                    if (event.target == notificationModal) {
                        notificationModal.style.display = 'none';
                    }
                });

                loadNotifications(user.uid);
            }
        } else {
            navLinks.innerHTML = `
                <a href="login.html">Đăng nhập</a>
                <a href="login.html?action=register" class="btn">Đăng ký</a>
            `;
        }
    });

    function loadNotifications(userId) {
    const notificationsRef = db.ref(`notifications/${userId}`);
    notificationsRef.off('value');
    notificationsRef.on('value', async (snapshot) => {
            const notifications = snapshot.val();
            const notificationModalBody = document.getElementById('notification-modal-body');
            const notificationCount = document.getElementById('notification-count');
            let unreadCount = 0;

            if (notifications && notificationModalBody) {
                notificationModalBody.innerHTML = '';
                const sortedNotifications = Object.entries(notifications).sort((a, b) => b[1].timestamp - a[1].timestamp);

                if (sortedNotifications.length === 0) {
                    notificationModalBody.innerHTML = '<div class="notification-item">Không có thông báo mới.</div>';
                } else {
                    for (const [key, notification] of sortedNotifications) {
                        const notificationItem = document.createElement('div');
                        notificationItem.classList.add('notification-item');
                        if (!notification.read) {
                            notificationItem.classList.add('unread');
                            unreadCount++;
                        }
                        const time = new Date(notification.timestamp).toLocaleString('vi-VN');

                        let senderName = 'Một người dùng';
                        if (notification.senderId === 'system') {
                            senderName = 'Hệ thống <i class="fas fa-robot" style="color: #007bff;"></i>';
                        } else {
                            // Fetch sender's name
                            const senderRef = db.ref(`users/${notification.senderId}`);
                            const senderSnapshot = await senderRef.once('value');
                            const senderData = senderSnapshot.val();
                            if (senderData) {
                                senderName = senderData.displayName;
                            }
                        }
                        notificationItem.innerHTML = `<a href="${notification.link}"><div><strong>${senderName}</strong> ${notification.message}</div><small>${time}</small></a>`;

                        notificationItem.addEventListener('click', () => window.location.href = notification.link);
                        notificationModalBody.appendChild(notificationItem);
                    }
                }

                if (unreadCount > 0) {
                    notificationCount.textContent = unreadCount > 9 ? '9+' : unreadCount;
                    notificationCount.style.display = 'block';
                } else {
                    notificationCount.style.display = 'none';
                }
            }
        });
    }

    function markNotificationsAsRead(userId) {
        const notificationsRef = db.ref(`notifications/${userId}`);
        notificationsRef.get().then((snapshot) => {
            if (snapshot.exists()) {
                const updates = {};
                snapshot.forEach((childSnapshot) => {
                    if (!childSnapshot.val().read) {
                        updates[`${childSnapshot.key}/read`] = true;
                    }
                });
                if (Object.keys(updates).length > 0) {
                    notificationsRef.update(updates);
                }
            }
        });
    }

    const googleSignInBtn = document.getElementById('google-signin-btn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    window.location.href = 'index.html';
                }).catch((error) => {
                    console.error("Google Sign-In Error:", error.message);
                    alert("Đăng nhập với Google thất bại: " + error.message);
                });
        });
    }
});