document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.getElementById("nav-links");

    auth.onAuthStateChanged((user) => {
        if (user) {
            const userRef = db.ref('users/' + user.uid);
            const defaultPhotoURL = `https://i.pravatar.cc/40?u=${user.uid}`;

            // Luôn cập nhật hồ sơ người dùng trong cơ sở dữ liệu với thông tin mới nhất từ nhà cung cấp xác thực
            userRef.update({
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL || defaultPhotoURL
            });

            // Daily login bonus
            userRef.once('value').then((snapshot) => {
                const userData = snapshot.val() || {};
                const lastLogin = userData.lastLogin;
                const today = new Date().toDateString();
                const lastLoginDate = lastLogin ? new Date(lastLogin).toDateString() : null;

                let currentCoins = userData.coins || userData.xu || 0;

                const updates = {};
                if (userData.hasOwnProperty('xu')) {
                    updates.xu = null;
                }

                if (lastLoginDate !== today) {
                    currentCoins += 100;
                    updates.lastLogin = firebase.database.ServerValue.TIMESTAMP;
                    updates.coins = currentCoins;
                    userRef.update(updates).then(() => {
                        alert("Bạn đã được tặng 100 xu vì đăng nhập ngày hôm nay!");
                    });
                } else {
                    updates.lastLogin = firebase.database.ServerValue.TIMESTAMP;
                    updates.coins = currentCoins;
                    userRef.update(updates);
                }
            });

            const displayName = user.displayName || user.email.split('@')[0];
            const photoURL = user.photoURL || defaultPhotoURL;

            if (navLinks) {
                navLinks.innerHTML = `
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
                               <a href="#" id="logout-button">Đăng xuất</a>
                        </div>
                    </div>
                `;
            }

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
        } else {
            navLinks.innerHTML = `
                <a href="login.html">Đăng nhập</a>
                <a href="login.html?action=register" class="btn">Đăng ký</a>
            `;
        }
    });

    function loadNotifications(userId) {
        const notificationsRef = db.ref(`notifications/${userId}`);
        notificationsRef.on('value', (snapshot) => {
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
                        notificationItem.innerHTML = `<a href="${notification.link}"><div>${notification.message}</div><small>${time}</small></a>`;
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
});

    const googleSignInBtn = document.getElementById('google-signin-btn');
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => {
                    // This gives you a Google Access Token. You can use it to access the Google API.
                    const credential = result.credential;
                    const token = credential.accessToken;
                    // The signed-in user info.
                    const user = result.user;
                    window.location.href = 'index.html';
                }).catch((error) => {
                    // Handle Errors here.
                    const errorCode = error.code;
                    const errorMessage = error.message;
                    // The email of the user's account used.
                    const email = error.email;
                    // The firebase.auth.AuthCredential type that was used.
                    const credential = error.credential;
                    console.error("Google Sign-In Error:", errorMessage);
                    alert("Đăng nhập với Google thất bại: " + errorMessage);
                });
        });
    }