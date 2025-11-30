document.addEventListener('DOMContentLoaded', () => {
    const testList = document.getElementById('test-list');

    const tests = [
        {
            title: 'Đề kiểm tra Toán 1 - Đề 1',
            path: 'baikiemtra/toan-1-de1.txt'
        },
         {
            title: 'Đề kiểm tra Toán 1 - Đề 2',
            path: 'baikiemtra/toan-1-de2.txt'
        }
    ];

    tests.forEach(test => {
        const testElement = document.createElement('div');
        testElement.classList.add('quiz-item');

        const title = document.createElement('h3');
        title.textContent = test.title;

        const button = document.createElement('a');
        button.href = `do-exam.html?test=${test.path}`;
        button.classList.add('do-quiz-button');
        button.textContent = 'Làm bài';

        testElement.appendChild(title);
        testElement.appendChild(button);
        testList.appendChild(testElement);
    });
});