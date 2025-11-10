document.addEventListener('DOMContentLoaded', () => {
    const giftCoinsForm = document.getElementById('gift-coins-form');
    const recipientInput = document.getElementById('recipient');
    const recipientSuggestions = document.getElementById('recipient-suggestions');
    const amountInput = document.getElementById('amount');
    const messageInput = document.getElementById('message');
    const giftItemSelect = document.getElementById('gift-item');
    let recipientId = null;

    const items = [
        {
            id: 'meo-an-sang',
            name: 'Mèo ăn sáng',
            price: 50,
            image: 'qua/mèo ăn sáng.png'
        },
        {
            id: 'o-to',
            name: 'Ô tô',
            price: 100,
            image: 'qua/ô tô.png'
        }
    ];

    let currentUser;
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            const urlParams = new URLSearchParams(window.location.search);
            const recipientUsername = urlParams.get('recipient');
            if (recipientUsername) {
                db.ref('users').orderByChild('displayName').equalTo(recipientUsername).once('value', snapshot => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        recipientId = Object.keys(userData)[0];
                        recipientInput.value = recipientUsername;
                        document.title = `Tặng xu cho ${recipientUsername}`;
                    }
                });
            }
            loadUserGifts(user.uid);
        } else {
            window.location.href = 'login.html';
        }
    });

    function loadUserGifts(userId) {
        const userGiftsRef = db.ref(`users/${userId}/gifts`);
        userGiftsRef.on('value', snapshot => {
            if (snapshot.exists()) {
                giftItemSelect.innerHTML = '<option value="">Không tặng quà</option>';
                snapshot.forEach(giftSnap => {
                    const gift = giftSnap.val();
                    const option = document.createElement('option');
                    option.value = giftSnap.key;
                    option.textContent = gift.itemName;
                    giftItemSelect.appendChild(option);
                });
            }
        });
    }

    recipientInput.addEventListener('input', () => {
        const query = recipientInput.value.toLowerCase();
        if (query.length < 2) {
            recipientSuggestions.innerHTML = '';
            return;
        }

        db.ref('users').orderByChild('displayName').startAt(query).endAt(query + '\uf8ff').limitToFirst(5).once('value', snapshot => {
            recipientSuggestions.innerHTML = '';
            if (snapshot.exists()) {
                snapshot.forEach(userSnap => {
                    const user = userSnap.val();
                    const suggestion = document.createElement('div');
                    suggestion.textContent = user.displayName;
                    suggestion.addEventListener('click', () => {
                        recipientInput.value = user.displayName;
                        recipientId = userSnap.key;
                        recipientSuggestions.innerHTML = '';
                    });
                    recipientSuggestions.appendChild(suggestion);
                });
            }
        });
    });

    giftCoinsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseInt(amountInput.value);
        const message = messageInput.value;
        const selectedGiftKey = giftItemSelect.value;

        if (!recipientId) {
            alert('Vui lòng chọn người nhận hợp lệ.');
            return;
        }

        if (amount <= 0) {
            alert('Số xu phải lớn hơn 0.');
            return;
        }

        const senderRef = db.ref(`users/${currentUser.uid}`);
        const recipientRef = db.ref(`users/${recipientId}`);

        if (selectedGiftKey) {
            const giftRef = senderRef.child('gifts').child(selectedGiftKey);
            giftRef.once('value', giftSnapshot => {
                if (giftSnapshot.exists()) {
                    const giftData = giftSnapshot.val();
                    const recipientGiftsRef = recipientRef.child('gifts').push();
                    recipientGiftsRef.set(giftData).then(() => {
                        giftRef.remove().then(() => {
                            transferCoins(senderRef, recipientRef, amount, message);
                        });
                    });
                } else {
                    alert("Bạn không sở hữu món quà này.");
                }
            });
        } else {
            transferCoins(senderRef, recipientRef, amount, message);
        }
    });

    function transferCoins(senderRef, recipientRef, amount, message) {
        db.ref().transaction(root => {
            if (!root.users || !root.users[currentUser.uid] || root.users[currentUser.uid].coins < amount) {
                return; // Abort transaction
            }
            if (!root.users[recipientId]) {
                root.users[recipientId] = { coins: 0 };
            }

            root.users[currentUser.uid].coins -= amount;
            root.users[recipientId].coins = (root.users[recipientId].coins || 0) + amount;
            return root;
        }, (error, committed, snapshot) => {
            if (error) {
                alert('Giao dịch thất bại: ' + error);
            } else if (!committed) {
                alert('Bạn không đủ xu để thực hiện giao dịch này.');
            } else {
                const notificationRef = db.ref(`notifications/${recipientId}`).push();
                notificationRef.set({
                    message: `${currentUser.displayName} đã tặng bạn ${amount} xu với lời nhắn: "${message}"`,
                    link: `wall.html?id=${currentUser.uid}`,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    read: false
                });
                alert('Tặng quà thành công!');
                window.location.href = `wall.html?id=${recipientId}`;
            }
        });
    }
});