

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userRef = db.ref(`users/${user.uid}`);
        userRef.on('value', (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                document.getElementById('xu-balance').textContent = userData.xu || 0;
            }
        });
    } else {
        // User is signed out
        window.location.href = 'login.html';
    }
});