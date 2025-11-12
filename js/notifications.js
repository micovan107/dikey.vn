document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.database();
    const auth = firebase.auth();

    const notificationIcon = document.getElementById('notification-icon');
    const notificationCount = document.getElementById('notification-count');
    const notificationModal = document.getElementById('notification-modal');
    const notificationModalBody = document.getElementById('notification-modal-body');
    const closeNotificationModal = document.querySelector('.close-notification-modal');

    auth.onAuthStateChanged(user => {
        if (user) {
            const notificationsRef = db.ref('notifications/' + user.uid).orderByChild('timestamp');
            notificationsRef.on('value', snapshot => {
                let unreadCount = 0;
                notificationModalBody.innerHTML = '';
                snapshot.forEach(childSnapshot => {
                    const notification = childSnapshot.val();
                    if (!notification.read) {
                        unreadCount++;
                    }
                    displayNotification(notification, childSnapshot.key);
                });
                notificationCount.textContent = unreadCount;
                notificationCount.style.display = unreadCount > 0 ? 'block' : 'none';
            });
        }
    });

    function displayNotification(notification, notificationId) {
        const notificationItem = document.createElement('div');
        notificationItem.classList.add('notification-item');
        if (!notification.read) {
            notificationItem.classList.add('unread');
        }

        const link = document.createElement('a');
        link.href = notification.link;

        const content = document.createElement('div');
        if (notification.type === 'gift') {
            const senderLink = document.createElement('a');
            senderLink.href = `wall.html?uid=${notification.senderId}`;
            senderLink.textContent = notification.senderName;

            content.appendChild(senderLink);
            content.append(` đã tặng bạn ${notification.amount} xu với lời nhắn: "`);
            const messageSpan = document.createElement('span');
            messageSpan.textContent = notification.message;
            content.appendChild(messageSpan);
            content.append("\"");

        } else {
            content.innerHTML = notification.message; // Fallback for older notifications
        }

        const timestamp = document.createElement('small');
        timestamp.textContent = new Date(notification.timestamp).toLocaleString();

        link.appendChild(content);
        link.appendChild(timestamp);
        notificationItem.appendChild(link);

        notificationItem.addEventListener('click', (e) => {
            e.preventDefault();
            db.ref('notifications/' + auth.currentUser.uid + '/' + notificationId).update({ read: true }).then(() => {
                window.location.href = notification.link;
            });
        });

        notificationModalBody.prepend(notificationItem);
    }

    notificationIcon.addEventListener('click', () => {
        notificationModal.style.display = 'block';
    });

    closeNotificationModal.addEventListener('click', () => {
        notificationModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == notificationModal) {
            notificationModal.style.display = 'none';
        }
    });
});