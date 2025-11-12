document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.database();
    const auth = firebase.auth();

    const recipientInput = document.getElementById('recipient');
    const userSearchResults = document.getElementById('user-search-results');
    const amountInput = document.getElementById('amount');
    const messageInput = document.getElementById('message');
    const giftButton = document.getElementById('gift-button');

    let selectedUserId = null;

    const urlParams = new URLSearchParams(window.location.search);
    const recipientId = urlParams.get('recipientId');
    const recipientName = urlParams.get('recipientName');

    if (recipientId && recipientName) {
        recipientInput.value = recipientName;
        selectedUserId = recipientId;
        recipientInput.disabled = true;
    }

    recipientInput.addEventListener('input', () => {
        const searchTerm = recipientInput.value.trim();
        userSearchResults.innerHTML = '';
        selectedUserId = null;

        if (searchTerm.length > 0) {
            db.ref('users').orderByChild('displayName').startAt(searchTerm).endAt(searchTerm + '\uf8ff').once('value', (snapshot) => {
                snapshot.forEach((childSnapshot) => {
                    const user = childSnapshot.val();
                    const userId = childSnapshot.key;
                    const searchItem = document.createElement('div');
                    searchItem.classList.add('user-search-item');
                    searchItem.textContent = user.displayName;
                    searchItem.addEventListener('click', () => {
                        recipientInput.value = user.displayName;
                        selectedUserId = userId;
                        userSearchResults.innerHTML = '';
                    });
                    userSearchResults.appendChild(searchItem);
                });
            });
        }
    });

    giftButton.addEventListener('click', () => {
        const amount = parseInt(amountInput.value);
        const message = messageInput.value;
        const currentUser = auth.currentUser;

        if (!currentUser) {
            alert('Bạn phải đăng nhập để tặng xu.');
            return;
        }

        if (selectedUserId && amount > 0) {
            const senderId = currentUser.uid;

            db.ref('users/' + senderId).once('value').then((snapshot) => {
                const senderData = snapshot.val();
                if (senderData.xu >= amount) {
                    const newSenderXu = senderData.xu - amount;
                    db.ref('users/' + senderId).update({ xu: newSenderXu });

                    db.ref('users/' + selectedUserId).once('value').then((snapshot) => {
                        const recipientData = snapshot.val();
                        const newRecipientXu = (recipientData.xu || 0) + amount;
                        db.ref('users/' + selectedUserId).update({ xu: newRecipientXu });

                        const giftRef = db.ref('gifts').push();
                        giftRef.set({
                            from: senderId,
                            to: selectedUserId,
                            amount: amount,
                            message: message,
                            timestamp: firebase.database.ServerValue.TIMESTAMP
                        });

                        const notificationRef = db.ref('notifications/' + selectedUserId).push();
                        notificationRef.set({
                            message: `<div><a href="wall.html?uid=${senderId}">${senderData.displayName}</a> đã tặng bạn ${amount} xu với lời nhắn: "${message}"</div>`,
                            link: `wall.html?uid=${senderId}`,
                            read: false,
                            timestamp: firebase.database.ServerValue.TIMESTAMP
                        });

                        alert(`Đã tặng ${amount} xu cho ${recipientInput.value}!`);
                        amountInput.value = '';
                        messageInput.value = '';
                        if (!recipientId) {
                            recipientInput.value = '';
                        }
                    });
                } else {
                    alert('Bạn không có đủ xu.');
                }
            });
        } else {
            alert('Vui lòng chọn người nhận và nhập số xu hợp lệ.');
        }
    });
});