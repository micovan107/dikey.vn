document.addEventListener('DOMContentLoaded', () => {
    const shopItemsContainer = document.getElementById('shop-items-container');

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

    function renderShopItems() {
        if (!shopItemsContainer) return;
        shopItemsContainer.innerHTML = '';
        items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('col-md-4', 'mb-4');
            itemElement.innerHTML = `
                <div class="card">
                    <img src="${item.image}" class="card-img-top" alt="${item.name}">
                    <div class="card-body">
                        <h5 class="card-title">${item.name}</h5>
                        <p class="card-text">Giá: ${item.price} xu</p>
                        <button class="btn btn-primary buy-btn" data-item-id="${item.id}">Mua</button>
                    </div>
                </div>
            `;
            shopItemsContainer.appendChild(itemElement);
        });
    }

    renderShopItems();

    shopItemsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('buy-btn')) {
            const itemId = e.target.dataset.itemId;
            const item = items.find(i => i.id === itemId);
            const user = auth.currentUser;

            if (!user) {
                alert('Bạn cần đăng nhập để mua vật phẩm.');
                return;
            }

            if (item) {
                handlePurchase(user, item);
            }
        }
    });

    function handlePurchase(user, item) {
        const userRef = db.ref('users/' + user.uid);
        userRef.transaction(userData => {
            if (userData) {
                const userXu = userData.xu || 0;

                if (userXu >= item.price) {
                    userData.xu = userXu - item.price;

                    if (!userData.gifts) {
                        userData.gifts = {};
                    }

                    const giftKey = Object.keys(userData.gifts).find(key => userData.gifts[key].itemId === item.id);

                    if (giftKey) {
                        userData.gifts[giftKey].quantity = (userData.gifts[giftKey].quantity || 1) + 1;
                    } else {
                        const newGiftKey = db.ref('users/' + user.uid + '/gifts').push().key;
                        userData.gifts[newGiftKey] = {
                            itemId: item.id,
                            itemName: item.name,
                            itemImage: item.image,
                            price: item.price,
                            quantity: 1,
                            purchaseDate: firebase.database.ServerValue.TIMESTAMP
                        };
                    }
                    alert(`Bạn đã mua thành công ${item.name}!`);
                } else {
                    alert('Bạn không đủ xu để mua vật phẩm này.');
                }
            }
            return userData;
        });
    }
});