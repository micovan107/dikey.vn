document.addEventListener("DOMContentLoaded", () => {
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const profileScore = document.getElementById("profile-score");
    const profileAvatar = document.getElementById("profile-avatar");
    const userPostsList = document.getElementById("user-posts-list");

    auth.onAuthStateChanged(user => {
        const user = auth.currentUser;
        if (user) {
            const userId = user.uid;
            const userRef = db.ref('users/' + userId);

            userRef.on('value', (snapshot) => {
                const userData = snapshot.val();
                if (userData) {
                    document.getElementById('profile-name').textContent = userData.displayName || 'N/A';
                    document.getElementById('profile-email').textContent = userData.email;
                    document.getElementById('profile-avatar').src = userData.photoURL || 'https://via.placeholder.com/150';
                    document.getElementById('profile-score').textContent = userData.score || 0;
                }
            });

            const userPostsRef = db.ref('posts').orderByChild('userId').equalTo(userId);
            userPostsRef.on('value', (snapshot) => {
                const postsList = document.getElementById('user-posts-list');
                postsList.innerHTML = '';
                snapshot.forEach((childSnapshot) => {
                    const post = childSnapshot.val();
                    const postId = childSnapshot.key;
                    const postElement = document.createElement('div');
                    postElement.classList.add('post-item-mini');
                    postElement.innerHTML = `
                        <h4><a href="detail.html?id=${postId}">${post.title}</a></h4>
                        <p>Môn học: ${post.subject}</p>
                    `;
                    postsList.appendChild(postElement);
                });
            });

            const achievementsRef = db.ref('achievements');
            achievementsRef.on('value', (snapshot) => {
                const achievementsList = document.getElementById('achievements-list');
                achievementsList.innerHTML = '';
                snapshot.forEach((childSnapshot) => {
                    const achievement = childSnapshot.val();
                    const achievementElement = document.createElement('div');
                    achievementElement.classList.add('achievement-item');
                    achievementElement.innerHTML = `
                        <i class="${achievement.icon}"></i>
                        <div>
                            <h4>${achievement.title}</h4>
                            <p>${achievement.description}</p>
                        </div>
                    `;
                    achievementsList.appendChild(achievementElement);
                });
            });

            const tabs = document.querySelectorAll('.tab-link');
            const tabContents = document.querySelectorAll('.tab-content');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const tabId = tab.dataset.tab;

                    tabs.forEach(t => t.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));

                    tab.classList.add('active');
                    document.getElementById(tabId).classList.add('active');
                });
            });
        }
    });
});