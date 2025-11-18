

async function loadQuizzes() {
    const quizListContainer = document.getElementById('quiz-list-container');
    const quizzesRef = db.ref('quizzes').orderByChild('createdAt');
    const snapshot = await quizzesRef.once('value');

    const quizzes = [];
    snapshot.forEach((childSnapshot) => {
        quizzes.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });

    // Reverse the array to show newest quizzes first
    quizzes.reverse().forEach((quiz) => {
        const quizItem = document.createElement('div');
        quizItem.classList.add('quiz-item');

        const quizLink = document.createElement('a');
        quizLink.href = `quiz-detail.html?id=${quiz.id}`;

        const quizTitle = document.createElement('p');
        quizTitle.textContent = quiz.question;

        quizLink.appendChild(quizTitle);
        quizItem.appendChild(quizLink);
        quizListContainer.appendChild(quizItem);
    });
}


loadQuizzes();

