document.addEventListener('DOMContentLoaded', () => {
    const examTitle = document.getElementById('exam-title');
    const examContent = document.getElementById('exam-content');
    const submitButton = document.getElementById('submit-exam');
    const examResult = document.getElementById('exam-result');

    const urlParams = new URLSearchParams(window.location.search);
    const testPath = urlParams.get('test');
    const testId = testPath.replace(/\//g, '_').replace(/\.txt$/, '');

    let questions = [];
    let currentUser = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            checkIfExamTaken();
        } else {
            // Handle user not logged in
            examContent.innerHTML = '<p>Bạn cần đăng nhập để làm bài kiểm tra.</p>';
        }
    });

    function checkIfExamTaken() {
        const userExamRef = db.ref(`userExams/${currentUser.uid}/${testId}`);
        userExamRef.once('value', snapshot => {
            if (snapshot.exists()) {
                const result = snapshot.val();
                examContent.innerHTML = `<p>Bạn đã hoàn thành bài kiểm tra này với số điểm: ${result.score}/10.</p>`;
                submitButton.style.display = 'none';
            } else {
                loadExam();
            }
        });
    }

    function loadExam() {
        if (testPath) {
            fetch(testPath)
                .then(response => response.text())
                .then(text => {
                    parseExam(text);
                    renderQuestions();
                });
        }
    }

    function parseExam(text) {
        const lines = text.split('\n').map(line => line.trim().replace('\r', ''));
        examTitle.textContent = lines.shift().replace(/\*/g, '');

        const content = lines.join('\n');
        const questionTypes = content.split(/(?=\*Trắc nghiệm\*|\*Đúng sai\*|\*Trả lời ngắn\*)/);

        questionTypes.forEach(typeBlock => {
            if (!typeBlock.trim()) return;

            let questionType = '';
            if (typeBlock.startsWith('*Trắc nghiệm*')) questionType = 'multiple-choice';
            else if (typeBlock.startsWith('*Đúng sai*')) questionType = 'true-false';
            else if (typeBlock.startsWith('*Trả lời ngắn*')) questionType = 'short-answer';

            const questionParts = typeBlock.split(/(?=Câu[\s\d]+)/);

            questionParts.forEach(part => {
                if (!part.trim() || part.startsWith('*')) return;

                const optionsRegex = /\*[Ll]ựa chọn\*\s*([\s\S]*?)(?=\*Đáp án\*)/;
                const answerRegex = /\*Đáp án\*\s*(\[[\s\S]*?\])/;

                const optionsMatch = part.match(optionsRegex);
                const answerMatch = part.match(answerRegex);

                const questionText = part.replace(optionsRegex, '').replace(answerRegex, '').trim();

                if (!questionText) return;

                const currentQuestion = {
                    question: questionText,
                    type: questionType,
                    options: [],
                    answer: null
                };

                if (optionsMatch && optionsMatch[1]) {
                    const optionsStr = optionsMatch[1].trim();
                    if (questionType === 'multiple-choice') {
                        currentQuestion.options = optionsStr.slice(1, -1).split(/\n/).map(o => o.trim()).filter(Boolean);
                    } else if (questionType === 'true-false') {
                        currentQuestion.options = optionsStr.match(/\[(.*?)\]/g).map(o => o.slice(1, -1));
                    }
                }

                if (answerMatch && answerMatch[1]) {
                    const answerStr = answerMatch[1].slice(1, -1).trim();
                     if (questionType === 'multiple-choice' || questionType === 'short-answer') {
                        currentQuestion.answer = answerStr;
                    } else if (questionType === 'true-false') {
                        currentQuestion.answer = answerStr.split('/');
                    }
                }
                questions.push(currentQuestion);
            });
        });
    }

    function renderQuestions() {
        examContent.innerHTML = '';
        questions.forEach((q, index) => {
            const questionElement = document.createElement('div');
            questionElement.classList.add('question');

            const questionText = document.createElement('p');
            questionText.textContent = q.question;
            questionElement.appendChild(questionText);

            const optionsElement = document.createElement('div');
            optionsElement.classList.add('options');

            if (q.type === 'multiple-choice') {
                q.options.forEach(option => {
                    const label = document.createElement('label');
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = `question-${index}`;
                    input.value = option.trim().charAt(0);
                    label.appendChild(input);
                    label.appendChild(document.createTextNode(' ' + option.trim()));
                    optionsElement.appendChild(label);
                });
            } else if (q.type === 'true-false') {
                q.options.forEach((option, optionIndex) => {
                    const optionContainer = document.createElement('div');
                    optionContainer.classList.add('true-false-option');
                    optionContainer.textContent = option.trim() + ' ';

                    const trueLabel = document.createElement('label');
                    const trueInput = document.createElement('input');
                    trueInput.type = 'radio';
                    trueInput.name = `question-${index}-${optionIndex}`;
                    trueInput.value = 'Đúng';
                    trueLabel.appendChild(trueInput);
                    trueLabel.appendChild(document.createTextNode(' Đúng'));

                    const falseLabel = document.createElement('label');
                    const falseInput = document.createElement('input');
                    falseInput.type = 'radio';
                    falseInput.name = `question-${index}-${optionIndex}`;
                    falseInput.value = 'Sai';
                    falseLabel.appendChild(falseInput);
                    falseLabel.appendChild(document.createTextNode(' Sai'));

                    optionContainer.appendChild(trueLabel);
                    optionContainer.appendChild(falseLabel);
                    optionsElement.appendChild(optionContainer);
                });
            } else if (q.type === 'short-answer') {
                const input = document.createElement('input');
                input.type = 'text';
                input.name = `question-${index}`;
                optionsElement.appendChild(input);
            }

            questionElement.appendChild(optionsElement);
            examContent.appendChild(questionElement);
        });
    }

    submitButton.addEventListener('click', () => {
        let totalScore = 0;
        questions.forEach((q, index) => {
            const questionElement = examContent.children[index];
            let isCorrect = false;

            if (q.type === 'multiple-choice') {
                const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
                if (selectedOption && selectedOption.value.toUpperCase() === q.answer.toUpperCase()) {
                    totalScore += 0.25;
                    isCorrect = true;
                }
            } else if (q.type === 'true-false') {
                let correctCount = 0;
                q.options.forEach((option, optionIndex) => {
                    const selectedOption = document.querySelector(`input[name="question-${index}-${optionIndex}"]:checked`);
                    if (selectedOption && selectedOption.value === q.answer[optionIndex]) {
                        correctCount++;
                    }
                });

                if (correctCount === 4) totalScore += 1;
                else if (correctCount === 3) totalScore += 0.5;
                else if (correctCount === 2) totalScore += 0.25;
                else if (correctCount === 1) totalScore += 0.1;

                if (correctCount === q.options.length) {
                    isCorrect = true;
                }

            } else if (q.type === 'short-answer') {
                const input = document.querySelector(`input[name="question-${index}"]`);
                if (input && input.value.trim().toLowerCase() === q.answer.toLowerCase()) {
                    totalScore += 0.25;
                    isCorrect = true;
                }
            }

            if (isCorrect) {
                questionElement.classList.add('correct');
            } else {
                questionElement.classList.add('incorrect');
                const correctAnswerElement = document.createElement('div');
                correctAnswerElement.classList.add('correct-answer');
                let correctAnswerText = '';
                if (q.type === 'multiple-choice') {
                    const correctOption = q.options.find(o => o.charAt(0).toUpperCase() === q.answer.toUpperCase());
                    correctAnswerText = `Đáp án đúng: ${correctOption}`;
                } else if (q.type === 'true-false') {
                    const correctAnswers = q.answer.map((ans, i) => `${q.options[i]}: ${ans}`).join(', ');
                    correctAnswerText = `Đáp án đúng: ${correctAnswers}`;
                } else if (q.type === 'short-answer') {
                    correctAnswerText = `Đáp án đúng: ${q.answer}`;
                }
                correctAnswerElement.textContent = correctAnswerText;
                questionElement.appendChild(correctAnswerElement);
            }
        });

        const finalScore = Math.min(10, totalScore);
        examResult.textContent = `Bạn đã đạt ${finalScore}/10 điểm.`;

        if (currentUser) {
            const userExamRef = db.ref(`userExams/${currentUser.uid}/${testId}`);
            userExamRef.set({
                score: finalScore,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            if (finalScore === 10) {
                const userRef = db.ref(`users/${currentUser.uid}/score`);
                userRef.transaction(currentScore => (currentScore || 0) + 100);
            } else {
                const userRef = db.ref(`users/${currentUser.uid}/score`);
                userRef.transaction(currentScore => (currentScore || 0) + Math.round(finalScore * 10));
            }
        }

        submitButton.style.display = 'none';
    });
});