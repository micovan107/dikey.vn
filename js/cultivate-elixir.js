document.addEventListener('DOMContentLoaded', () => {
    const db = firebase.database();
    const auth = firebase.auth();

    const elixirInventoryContainer = document.getElementById('elixir-inventory');

    // This should match the items in buy-elixir.js to know their effects
    const allElixirTypes = {
        'linh_dan_suc_manh_1': {
            name: 'Linh Đan Sức Mạnh (Sơ cấp)',
            effects: { power: 10 },
            image: 'linhdan/rumon.png'
        },
        'linh_dan_mau_1': {
            name: 'Linh Đan Máu (Sơ cấp)',
            effects: { health: 50 },
            image: 'linhdan/Nahato.png'
        },
        'linh_dan_phong_thu_1': {
            name: 'Linh Đan Phòng Thủ (Sơ cấp)',
            effects: { defense: 5 },
            image: 'linhdan/Nika.png'
        }
    };

    auth.onAuthStateChanged(user => {
        if (user) {
            const userRef = db.ref('users/' + user.uid);
            userRef.on('value', (snapshot) => {
                const userData = snapshot.val();
                if (userData && userData.elixirs) {
                    renderElixirInventory(user, userData.elixirs);
                } else {
                    elixirInventoryContainer.innerHTML = '<p>Bạn không có linh đan nào trong kho.</p>';
                }
            });
        } else {
            elixirInventoryContainer.innerHTML = '<p>Vui lòng đăng nhập để xem kho của bạn.</p>';
        }
    });

    function renderElixirInventory(user, elixirs) {
        elixirInventoryContainer.innerHTML = '';
        for (const elixirId in elixirs) {
            const quantity = elixirs[elixirId];
            const elixirInfo = allElixirTypes[elixirId];

            if (quantity > 0 && elixirInfo) {
                const itemElement = document.createElement('div');
                itemElement.classList.add('col-md-4', 'col-sm-6');
                const effectsDescription = Object.entries(elixirInfo.effects).map(([stat, value]) => {
                    return `+${value} ${stat.charAt(0).toUpperCase() + stat.slice(1)}`;
                }).join(', ');

                itemElement.innerHTML = `
                    <div class="card mb-4 shop-item">
                        <img src="${elixirInfo.image}" class="card-img-top" alt="${elixirInfo.name}">
                        <div class="card-body">
                            <h5 class="card-title">${elixirInfo.name}</h5>
                            <p class="card-text">Số lượng: ${quantity}</p>
                            <p class="effects">Hiệu ứng: ${effectsDescription}</p>
                            <button class="btn btn-success cultivate-btn" data-elixir-id="${elixirId}">Luyện</button>
                        </div>
                    </div>
                `;
                elixirInventoryContainer.appendChild(itemElement);
            }
        }

        document.querySelectorAll('.cultivate-btn').forEach(button => {
            button.addEventListener('click', () => {
                const elixirId = button.dataset.elixirId;
                cultivateElixir(user, elixirId);
            });
        });
    }

    function cultivateElixir(user, elixirId) {
        const elixirInfo = allElixirTypes[elixirId];
        if (!elixirInfo) {
            alert('Linh đan không hợp lệ!');
            return;
        }

        const userRef = db.ref('users/' + user.uid);
        userRef.transaction(userData => {
            if (userData && userData.elixirs && userData.elixirs[elixirId] > 0) {
                // Decrease elixir count
                userData.elixirs[elixirId]--;

                // Apply effects
                for (const stat in elixirInfo.effects) {
                    userData[stat] = (userData[stat] || 0) + elixirInfo.effects[stat];
                }

            } else {
                // Elixir not found or quantity is zero
                return; // Abort
            }
            return userData;
        }, (error, committed, snapshot) => {
            if (error) {
                alert('Luyện thất bại: ' + error);
            } else if (committed) {
                alert(`Bạn đã luyện thành công ${elixirInfo.name}!`);
            } else {
                alert('Không thể luyện linh đan này.');
            }
        });
    }
});