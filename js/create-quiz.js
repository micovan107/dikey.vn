
const storage = firebase.storage();


let currentUser;

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
    } else {
        window.location.href = 'login.html';
    }
});

const addAnswerButton = document.getElementById('add-answer-button');
const answersContainer = document.getElementById('answers-container');
let answerCount = 2;

addAnswerButton.addEventListener('click', () => {
    if (answerCount < 4) {
        answerCount++;
        const newAnswerGroup = document.createElement('div');
        newAnswerGroup.classList.add('form-group', 'answer-group');
        newAnswerGroup.innerHTML = `
            <label>Đáp án ${answerCount}</label>
            <input type="text" class="answer-input" required>
            <input type="radio" name="correct-answer" value="${answerCount - 1}" required>
        `;
        answersContainer.appendChild(newAnswerGroup);
    }
    if (answerCount === 4) {
        addAnswerButton.style.display = 'none';
    }
});

const createQuizForm = document.getElementById('create-quiz-form');

createQuizForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const question = document.getElementById('quiz-question').value;
    const imageFile = document.getElementById('quiz-image').files[0];
    const answerInputs = document.querySelectorAll('.answer-input');
    const correctAnswer = document.querySelector('input[name="correct-answer"]:checked').value;

    const answers = [];
    answerInputs.forEach(input => {
        answers.push(input.value);
    });

    let imageUrl = null;
    if (imageFile) {
        const storageRef = storage.ref(`quiz-images/${Date.now()}_${imageFile.name}`);
        await storageRef.put(imageFile);
        imageUrl = await storageRef.getDownloadURL();
    }

    try {
        const newQuizRef = db.ref('quizzes').push();
        await newQuizRef.set({
            authorId: currentUser.uid,
            question: question,
            imageUrl: imageUrl,
            answers: answers,
            correctAnswer: parseInt(correctAnswer),
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            solvers: []
        });
        alert("Tạo trắc nghiệm thành công!");
        window.location.href = 'quiz-list.html';
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("Có lỗi xảy ra, vui lòng thử lại.");
    }
});