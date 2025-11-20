document.addEventListener('DOMContentLoaded', () => {
    let currentUser;

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
        } else {
            window.location.href = 'login.html';
        }
    });

    const quizType = document.getElementById('quiz-type');
    const answersContainer = document.getElementById('answers-container');
    const addAnswerButton = document.getElementById('add-answer-button');

    function updateAnswerFields() {
        const selectedType = quizType.value;
        answersContainer.innerHTML = '';

        if (selectedType === 'multiple-choice') {
            addAnswerButton.style.display = 'block';
            for (let i = 0; i < 2; i++) {
                const answerGroup = document.createElement('div');
                answerGroup.classList.add('form-group', 'answer-group');
                answerGroup.innerHTML = `
                    <label>Đáp án ${i + 1}</label>
                    <input type="text" class="answer-input" required>
                    <input type="radio" name="correct-answer" value="${i}" required>
                `;
                answersContainer.appendChild(answerGroup);
            }
        } else if (selectedType === 'fill-in-the-blank') {
            addAnswerButton.style.display = 'none';
            const answerGroup = document.createElement('div');
            answerGroup.classList.add('form-group');
            answerGroup.innerHTML = `
                <label>Đáp án đúng (phân cách bằng dấu phẩy)</label>
                <input type="text" id="correct-answers" class="answer-input" required placeholder="ví dụ: con gà, gà, chicken">
            `;
            answersContainer.appendChild(answerGroup);
        }
    }

    quizType.addEventListener('change', updateAnswerFields);

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

    // Initial setup
    updateAnswerFields();

    const createQuizForm = document.getElementById('create-quiz-form');

    createQuizForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const question = document.getElementById('quiz-question').value;
        const type = document.getElementById('quiz-type').value;
        const imageFile = document.getElementById('quiz-image').files[0];

        const quizData = {
            authorId: currentUser.uid,
            question: question,
            type: type,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            solvers: [],
            subjectId: '22', // Đố vui
            subjectName: 'Đố vui'
        };

        if (type === 'multiple-choice') {
            const answerInputs = document.querySelectorAll('.answer-input');
            const correctAnswer = document.querySelector('input[name="correct-answer"]:checked').value;
            const answers = [];
            answerInputs.forEach(input => {
                answers.push(input.value);
            });
            quizData.answers = answers;
            quizData.correctAnswer = parseInt(correctAnswer);
        } else {
            const correctAnswers = document.getElementById('correct-answers').value.split(',').map(s => s.trim().toLowerCase());
            quizData.correctAnswers = correctAnswers;
        }

        let imageUrl = null;
        if (imageFile) {
            const formData = new FormData();
            formData.append('file', imageFile);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset); 

            try {
                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, { 
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(`Cloudinary upload failed: ${data.error.message}`);
                }
                imageUrl = data.secure_url;
            } catch (error) {
                console.error('Error uploading image to Cloudinary:', error);
                alert('Có lỗi xảy ra khi tải lên hình ảnh.');
                return;
            }
        }
        quizData.imageUrl = imageUrl;

        try {
            const newQuizRef = db.ref('quizzes').push();
            await newQuizRef.set(quizData);
            alert("Tạo đố vui thành công!");
            window.location.href = 'fun-quiz-list.html';
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Có lỗi xảy ra, vui lòng thử lại.");
        }
    });
});