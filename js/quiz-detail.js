document.addEventListener("DOMContentLoaded", function () {
    const quizDetailContainer = document.getElementById("quiz-detail-container");
    const nextQuizBtn = document.getElementById("next-quiz-btn");
    const authorInfoContainer = document.getElementById("author-info");
    let currentQuizId = null;
    let allQuizIds = [];
    let currentUser;

    function getQuizIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    function loadQuiz(quizId) {
        const quizRef = db.ref(`quizzes/${quizId}`);
        quizRef.once("value")
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const quiz = snapshot.val();
                    document.title = quiz.question; // Set the page title
                    displayQuizDetail(quiz, quizId);
                    loadAuthorInfo(quiz.authorId);
                    nextQuizBtn.style.display = "block"; // Show the button
                } else {
                    quizDetailContainer.innerHTML = "<p>Quiz not found.</p>";
                }
            })
            .catch((error) => {
                console.error("Error getting quiz: ", error);
            });
    }

    function loadAuthorInfo(authorId) {
        const userRef = db.ref(`users/${authorId}`);
        userRef.once("value")
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const author = snapshot.val();
                    displayAuthorInfo(author);
                } else {
                    console.log("Author not found");
                }
            })
            .catch((error) => {
                console.error("Error getting author info: ", error);
            });
    }

    function displayAuthorInfo(author) {
        authorInfoContainer.innerHTML = `
            <p>Đăng bởi:</p>
            <img src="${author.photoURL || 'default-avatar.png'}" alt="${author.displayName}" class="author-avatar">
            <span>${author.displayName}</span>
        `;
    }

    function loadSolvers(solverIds, containerId, title) {
        const container = document.getElementById(containerId).querySelector('div');
        container.innerHTML = `<h3>${title}</h3>`;
    
        if (!solverIds) {
        container.innerHTML += '<p style="color: #fff;">Chưa có ai.</p>';
        return;
    }

    const solverUids = Object.values(solverIds);
    if (solverUids.length === 0) {
        container.innerHTML += '<p style="color: #fff;">Chưa có ai.</p>';
        return;
    }
    
    
        solverUids.forEach(uid => {
            const userRef = db.ref(`users/${uid}`);
            userRef.once("value").then(snapshot => {
                if (snapshot.exists()) {
                    const user = snapshot.val();
                    const solverDiv = document.createElement('div');
                    solverDiv.classList.add('solver');
                    solverDiv.innerHTML = `
                        <img src="${user.photoURL || 'default-avatar.png'}" alt="${user.displayName}">
                        <span>${user.displayName}</span>
                    `;
                    container.appendChild(solverDiv);
                }
            });
        });
    }

    function displayQuizDetail(quiz, quizId) {
        quizDetailContainer.innerHTML = ""; // Clear previous content

        const question = document.createElement('p');
        question.textContent = quiz.question;
        quizDetailContainer.appendChild(question);

        if (quiz.imageUrl) {
            const image = document.createElement('img');
            image.src = quiz.imageUrl;
            image.id = 'quiz-image';
            quizDetailContainer.appendChild(image);
        }

        if (quiz.type === 'fill-in-the-blank') {
            displayFillInTheBlank(quiz, quizId);
        } else {
            displayMultipleChoice(quiz, quizId);
        }

        loadSolvers(quiz.solvers, 'correct-solvers-container', '');
        loadSolvers(quiz.incorrectSolvers, 'incorrect-solvers-container', '');
    }

    function displayMultipleChoice(quiz, quizId) {
        const answerOptions = document.createElement('div');
        answerOptions.classList.add('answer-options');

        quiz.answers.forEach((answer, index) => {
            const answerButton = document.createElement('button');
            answerButton.textContent = answer;
            answerButton.dataset.index = index;
            answerOptions.appendChild(answerButton);
        });

        quizDetailContainer.appendChild(answerOptions);

        const hasSolved = currentUser && quiz.solvers && Object.values(quiz.solvers).includes(currentUser.uid);
        const hasAnsweredIncorrectly = currentUser && quiz.incorrectSolvers && Object.values(quiz.incorrectSolvers).includes(currentUser.uid);

        if (!currentUser) {
            answerOptions.querySelectorAll('button').forEach(button => {
                button.disabled = true;
            });
            const loginMessage = document.createElement('p');
            loginMessage.innerHTML = 'Bạn cần <a href="login.html">đăng nhập</a> để trả lời.';
            quizDetailContainer.appendChild(loginMessage);
        } else if (quiz.authorId === currentUser.uid || hasSolved || hasAnsweredIncorrectly) {
            // Disable buttons if user is author or has already solved
            answerOptions.querySelectorAll('button').forEach(button => {
                button.disabled = true;
                if (parseInt(button.dataset.index) === quiz.correctAnswer) {
                    button.style.backgroundColor = 'lightgreen';
                }
            });
            if (quiz.authorId === currentUser.uid) {
                const authorMessage = document.createElement('p');
                authorMessage.textContent = "Bạn không thể tự giải bài của mình.";
                quizDetailContainer.appendChild(authorMessage);
            } else if (hasSolved) {
                const solvedMessage = document.createElement('p');
                solvedMessage.textContent = "Bạn đã làm bài này rồi.";
                quizDetailContainer.appendChild(solvedMessage);
            } else if (hasAnsweredIncorrectly) {
                const incorrectMessage = document.createElement('p');
                incorrectMessage.textContent = "Bạn đã trả lời sai và không thể làm lại.";
                quizDetailContainer.appendChild(incorrectMessage);
            }
        } else {
            answerOptions.addEventListener('click', async (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const selectedAnswer = parseInt(e.target.dataset.index);
                    const quizRef = db.ref(`quizzes/${quizId}`);

                    if (selectedAnswer === quiz.correctAnswer) {
                        // Correct answer
                        const userRef = db.ref(`users/${currentUser.uid}`);
                        userRef.transaction((currentData) => {
                            if (currentData) {
                                currentData.xu = (currentData.xu || 0) + 20;
                            }
                            return currentData;
                        });

                        await quizRef.child('solvers').push(currentUser.uid);

                        alert("Chính xác! Bạn được cộng 20 xu.");
                    } else {
                        // Incorrect answer
                        await quizRef.child('incorrectSolvers').push(currentUser.uid);
                        alert("Sai rồi, thử lại lần sau nhé!");
                    }
                    // Reload to show updated state
                    window.location.reload();
                }
            });
        }
    }

    function displayFillInTheBlank(quiz, quizId) {
        const answerForm = document.createElement('form');
        answerForm.id = 'fill-in-the-blank-form';
        answerForm.innerHTML = `
            <div class="form-group">
                <label for="user-answer">Câu trả lời của bạn</label>
                <input type="text" id="user-answer" required>
            </div>
            <button type="submit">Kiểm tra</button>
        `;
        quizDetailContainer.appendChild(answerForm);

        const hasSolved = currentUser && quiz.solvers && Object.values(quiz.solvers).includes(currentUser.uid);
        const hasAnsweredIncorrectly = currentUser && quiz.incorrectSolvers && Object.values(quiz.incorrectSolvers).includes(currentUser.uid);

        if (!currentUser) {
            answerForm.querySelector('button').disabled = true;
            answerForm.querySelector('input').disabled = true;
            const loginMessage = document.createElement('p');
            loginMessage.innerHTML = 'Bạn cần <a href="login.html">đăng nhập</a> để trả lời.';
            quizDetailContainer.appendChild(loginMessage);
        } else if (quiz.authorId === currentUser.uid || hasSolved || hasAnsweredIncorrectly) {
            answerForm.querySelector('button').disabled = true;
            answerForm.querySelector('input').disabled = true;

            if (quiz.authorId === currentUser.uid) {
                const authorMessage = document.createElement('p');
                authorMessage.textContent = "Bạn không thể tự giải bài của mình.";
                quizDetailContainer.appendChild(authorMessage);
                const correctAnswers = document.createElement('p');
                correctAnswers.textContent = `Đáp án đúng: ${quiz.correctAnswers.join(', ')}`;
                quizDetailContainer.appendChild(correctAnswers);
            } else if (hasSolved) {
                const solvedMessage = document.createElement('p');
                solvedMessage.textContent = "Bạn đã làm bài này rồi.";
                quizDetailContainer.appendChild(solvedMessage);
                const correctAnswers = document.createElement('p');
                correctAnswers.textContent = `Đáp án đúng: ${quiz.correctAnswers.join(', ')}`;
                quizDetailContainer.appendChild(correctAnswers);
            } else if (hasAnsweredIncorrectly) {
                const incorrectMessage = document.createElement('p');
                incorrectMessage.textContent = "Bạn đã trả lời sai và không thể làm lại.";
                quizDetailContainer.appendChild(incorrectMessage);
            }

        } else {
            answerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const userAnswer = document.getElementById('user-answer').value.trim().toLowerCase();
                const isCorrect = quiz.correctAnswers.some(answer => answer.toLowerCase() === userAnswer);
                const quizRef = db.ref(`quizzes/${quizId}`);

                if (isCorrect) {
                    const userRef = db.ref(`users/${currentUser.uid}`);
                    userRef.transaction((currentData) => {
                        if (currentData) {
                            currentData.xu = (currentData.xu || 0) + 20;
                        }
                        return currentData;
                    });

                    await quizRef.child('solvers').push(currentUser.uid);

                    alert("Chính xác! Bạn được cộng 20 xu.");
                } else {
                    await quizRef.child('incorrectSolvers').push(currentUser.uid);
                    alert("Sai rồi, thử lại lần sau nhé!");
                }
                window.location.reload();
            });
        }
    }

    function fetchAllQuizIds() {
        const quizzesRef = db.ref("quizzes");
        quizzesRef.once("value")
            .then((snapshot) => {
                if (snapshot.exists()) {
                    allQuizIds = Object.keys(snapshot.val());
                }
            })
            .catch((error) => {
                console.error("Error fetching quiz IDs: ", error);
            });
    }

    function loadRandomQuiz() {
        if (allQuizIds.length > 0) {
            let randomIndex = Math.floor(Math.random() * allQuizIds.length);
            let randomQuizId = allQuizIds[randomIndex];

            // Ensure the new quiz is different from the current one
            while (randomQuizId === currentQuizId && allQuizIds.length > 1) {
                randomIndex = Math.floor(Math.random() * allQuizIds.length);
                randomQuizId = allQuizIds[randomIndex];
            }

            window.location.href = `quiz-detail.html?id=${randomQuizId}`;
        }
    }

    auth.onAuthStateChanged((user) => {
        currentUser = user;
        const quizId = getQuizIdFromUrl();
        if (quizId) {
            currentQuizId = quizId;
            loadQuiz(quizId);
            fetchAllQuizIds();
        } else {
            quizDetailContainer.innerHTML = "<p>No quiz ID found in URL.</p>";
        }
    });

    // Event listener for the next quiz button
    nextQuizBtn.addEventListener("click", loadRandomQuiz);

    // Mobile modal logic
    const showCorrectBtn = document.getElementById('show-correct-solvers');
    const showIncorrectBtn = document.getElementById('show-incorrect-solvers');
    const correctSolversContainer = document.getElementById('correct-solvers-container');
    const incorrectSolversContainer = document.getElementById('incorrect-solvers-container');

    function setupModal(button, container) {
        const closeBtn = container.querySelector('.close-btn');

        button.addEventListener('click', () => {
            container.classList.add('active');
        });

        closeBtn.addEventListener('click', () => {
            container.classList.remove('active');
        });
    }

    setupModal(showCorrectBtn, correctSolversContainer);
    setupModal(showIncorrectBtn, incorrectSolversContainer);
});