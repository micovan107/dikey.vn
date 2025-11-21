

async function loadQuizzes() {
    const quizListContainer = document.getElementById('quiz-list-container');
    if (!quizListContainer) return;

    try {
        const quizzesRef = db.ref('quizzes').orderByChild('createdAt');
        const snapshot = await quizzesRef.once('value');

        if (!snapshot.exists()) {
            quizListContainer.innerHTML = '<p>Chưa có câu đố nào.</p>';
            return;
        }

        const quizzes = [];
        snapshot.forEach((childSnapshot) => {
            const quiz = { id: childSnapshot.key, ...childSnapshot.val() };
            if (quiz.subjectName !== 'Đố vui') {
                quizzes.push(quiz);
            }
        });

        // Fetch all author data in parallel
        const authorIds = [...new Set(quizzes.map(q => q.authorId).filter(id => id))];
        const authorPromises = authorIds.map(id => db.ref(`users/${id}/displayName`).once('value'));
        const authorSnapshots = await Promise.all(authorPromises);
        
        const authors = {};
        authorSnapshots.forEach((snap, index) => {
            authors[authorIds[index]] = snap.val() || 'Vô danh';
        });

        quizListContainer.innerHTML = ''; // Clear loading placeholder or old content

        // Reverse the array to show newest quizzes first
        quizzes.reverse().forEach((quiz) => {
            const authorName = authors[quiz.authorId] || 'Vô danh';
            const date = new Date(quiz.createdAt);
            const formattedDate = `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

            const quizItem = document.createElement('div');
            quizItem.classList.add('nen_trang_full');

            const subjectInfo = quiz.subjectName && quiz.gradeName ? `<span>(${quiz.subjectName} - ${quiz.gradeName})</span>` : '';

            quizItem.innerHTML = `
                <p>
                    <a href="quiz-detail.html?id=${quiz.id}">
                        ${quiz.question}
                        ${subjectInfo}
                    </a>
                </p>
                <div class="create_date_in_list">${authorName} - ${formattedDate}</div>
            `;

            quizListContainer.appendChild(quizItem);
        });
    } catch (error) {
        console.error("Lỗi khi tải danh sách câu đố:", error);
        if (quizListContainer) {
            quizListContainer.innerHTML = '<p>Đã xảy ra lỗi khi tải danh sách câu đố. Vui lòng thử lại.</p>';
        }
    }
}


loadQuizzes();