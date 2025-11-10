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

    function displayQuizDetail(quiz, quizId) {
        quizDetailContainer.innerHTML = ""; // Clear previous content

        const question = document.createElement('h1');
        question.textContent = quiz.question;
        quizDetailContainer.appendChild(question);

        if (quiz.imageUrl) {
            const image = document.createElement('img');
            image.src = quiz.imageUrl;
            image.id = 'quiz-image';
            quizDetailContainer.appendChild(image);
        }

        const answerOptions = document.createElement('div');
        answerOptions.classList.add('answer-options');

        quiz.answers.forEach((answer, index) => {
            const answerButton = document.createElement('button');
            answerButton.textContent = answer;
            answerButton.dataset.index = index;
            answerOptions.appendChild(answerButton);
        });

        quizDetailContainer.appendChild(answerOptions);

        if (quiz.authorId === currentUser.uid || (quiz.solvers && Object.values(quiz.solvers).includes(currentUser.uid))) {
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
            } else {
                const solvedMessage = document.createElement('p');
                solvedMessage.textContent = "Bạn đã làm bài này rồi.";
                quizDetailContainer.appendChild(solvedMessage);
            }
        } else {
            answerOptions.addEventListener('click', async (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const selectedAnswer = parseInt(e.target.dataset.index);
                    if (selectedAnswer === quiz.correctAnswer) {
                        // Correct answer
                        const userRef = db.ref(`users/${currentUser.uid}`);
                        userRef.transaction((currentData) => {
                            if (currentData) {
                                currentData.xu = (currentData.xu || 0) + 20;
                            }
                            return currentData;
                        });

                        const quizRef = db.ref(`quizzes/${quizId}`);
                        await quizRef.child('solvers').push(currentUser.uid);

                        alert("Chính xác! Bạn được cộng 20 xu.");
                    } else {
                        // Incorrect answer
                        alert("Sai rồi, thử lại lần sau nhé!");
                    }
                    // Reload to show updated state
                    window.location.reload();
                }
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
        if (user) {
            currentUser = user;
            const quizId = getQuizIdFromUrl();
            if (quizId) {
                currentQuizId = quizId;
                loadQuiz(quizId);
                fetchAllQuizIds();
            } else {
                quizDetailContainer.innerHTML = "<p>No quiz ID found in URL.</p>";
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    // Event listener for the next quiz button
    nextQuizBtn.addEventListener("click", loadRandomQuiz);
});