document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.database();
    const auth = firebase.auth();

    const userXuSpan = document.getElementById('user-xu');
    const elixirShopItemsContainer = document.getElementById('elixir-shop-items');

    const elixirItems = [
        {
            id: 'linh_dan_suc_manh_1',
            name: 'Rumon (Sơ cấp)',
            price: 200,
            effects: { power: 10 },
            image: 'linhdan/rumon.png' // Placeholder
        },
        {
            id: 'linh_dan_mau_1',
            name: 'Nahato (Sơ cấp)',
            price: 150,
            effects: { health: 50 },
            image: 'linhdan/Nahato.png' // Placeholder
        },
        {
            id: 'linh_dan_phong_thu_1',
            name: 'Nika (Sơ cấp)',
            price: 150,
            effects: { defense: 5 },
            image: 'linhdan/Nika.png' // Placeholder
        }
    ];

    auth.onAuthStateChanged(user => {
        if (user) {
            const userRef = db.ref('users/' + user.uid);
            userRef.on('value', (snapshot) => {
                const userData = snapshot.val();
                if (userData && userData.xu !== undefined) {
                    userXuSpan.textContent = userData.xu;
                } else {
                    userXuSpan.textContent = '0';
                }
            });
            renderElixirShopItems(user);
        } else {
            userXuSpan.textContent = 'N/A';
            elixirShopItemsContainer.innerHTML = '<p>Vui lòng đăng nhập để xem cửa hàng.</p>';
        }
    });

    function renderElixirShopItems(user) {
        elixirShopItemsContainer.innerHTML = '';
        elixirItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('col-md-4', 'col-sm-6');
            const effectsDescription = Object.entries(item.effects).map(([stat, value]) => {
                return `+${value} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`;
            }).join(', ');

            itemElement.innerHTML = `
                <div class="card mb-4 shop-item">
                    <img src="${item.image}" class="card-img-top" alt="${item.name}">
                    <div class="card-body">
                        <h5 class="card-title">${item.name}</h5>
                        <p class="price">Giá: ${item.price} xu</p>
                        <p class="effects">Hiệu ứng: ${effectsDescription}</p>
                        <button class="btn btn-primary buy-btn" data-item-id="${item.id}">Mua</button>
                    </div>
                </div>
            `;
            elixirShopItemsContainer.appendChild(itemElement);
        });

        document.querySelectorAll('.buy-btn').forEach(button => {
            button.addEventListener('click', () => {
                const itemId = button.dataset.itemId;
                buyElixir(user, itemId);
            });
        });
    }

    function buyElixir(user, itemId) {
        const item = elixirItems.find(i => i.id === itemId);
        if (!item) {
            alert('Vật phẩm không hợp lệ!');
            return;
        }

        const userRef = db.ref('users/' + user.uid);
        userRef.transaction(userData => {
            if (userData) {
                if ((userData.xu || 0) >= item.price) {
                    userData.xu -= item.price;
                    if (!userData.elixirs) {
                        userData.elixirs = {};
                    }
                    if (!userData.elixirs[item.id]) {
                        userData.elixirs[item.id] = 0;
                    }
                    userData.elixirs[item.id]++;
                } else {
                    return; // Abort transaction
                }
            }
            return userData;
        }, (error, committed, snapshot) => {
            if (error) {
                alert('Giao dịch thất bại: ' + error);
            } else if (!committed) {
                alert('Bạn không đủ xu để mua vật phẩm này!');
            } else {
                alert(`Bạn đã mua thành công ${item.name}! Nó đã được thêm vào kho của bạn.`);
            }
        });
    }
});