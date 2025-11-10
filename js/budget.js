

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userRef = db.ref(`users/${user.uid}`);
        userRef.on('value', (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                document.getElementById('xu-balance').textContent = userData.xu || 0;
                document.getElementById('coint-balance').textContent = userData.coint || 0;
            }
        });

        document.getElementById('exchange-button').addEventListener('click', () => {
            userRef.transaction((currentData) => {
                if (currentData) {
                    if (currentData.xu && currentData.xu >= 1000) {
                        currentData.xu -= 1000;
                        currentData.coint = (currentData.coint || 0) + 1;
                    } else {
                        alert("Không đủ xu để đổi!");
                    }
                }
                return currentData;
            });
        });
    } else {
        // User is signed out
        window.location.href = 'login.html';
    }
});