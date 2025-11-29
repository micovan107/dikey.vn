document.addEventListener('DOMContentLoaded', function() {
    const achievements = [
        { name: 'Người bắt đầu', points: 100 },
        { name: 'Nhập học', points: 200 },
        { name: 'Học sinh', points: 400 },
        { name: 'Học bá', points: 800 },
        { name: 'Mọt sách', points: 1600 },
        { name: 'Thần đồng', points: 3200 }
    ];

    const achievementsList = document.getElementById('achievements-list');
    const userScoreSpan = document.getElementById('user-score');

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            const userId = user.uid;
            const userRef = firebase.database().ref('users/' + userId);

            userRef.on('value', (snapshot) => {
                const userData = snapshot.val();
                const userScore = userData.score || 0;
                userScoreSpan.textContent = userScore;

                achievementsList.innerHTML = '';

                let currentLevelPoints = 0;
                let nextLevelPoints = achievements[0].points;

                for (let i = 0; i < achievements.length; i++) {
                    const achievement = achievements[i];
                    const isUnlocked = userScore >= achievement.points;

                    const achievementElement = document.createElement('div');
                    achievementElement.classList.add('achievement', isUnlocked ? 'unlocked' : 'locked');

                    let progressPercent = 0;
                    if (i > 0) {
                        currentLevelPoints = achievements[i-1].points;
                    }
                    nextLevelPoints = achievement.points;

                    if (userScore >= currentLevelPoints) {
                        progressPercent = ((userScore - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
                        if (progressPercent > 100) progressPercent = 100;
                    }


                    achievementElement.innerHTML = `
                        <h3>${achievement.name} (${achievement.points} điểm)</h3>
                        <p>${isUnlocked ? 'Đã đạt được' : 'Chưa đạt được'}</p>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${progressPercent}%;"></div>
                        </div>
                    `;

                    achievementsList.appendChild(achievementElement);
                }
            });
        } else {
            window.location.href = 'login.html';
        }
    });
});