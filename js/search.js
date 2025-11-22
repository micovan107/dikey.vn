document.addEventListener('DOMContentLoaded', () => {
    const searchParams = new URLSearchParams(window.location.search);
    const query = searchParams.get('q');
    const searchQuerySpan = document.getElementById('search-query');
    const searchResultsContainer = document.getElementById('search-results');

    if (query) {
        const normalizedQuery = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        searchQuerySpan.textContent = query;
        searchResultsContainer.innerHTML = '<p>Đang tìm kiếm...</p>';

        Promise.all([
            searchIn('posts', ['description'], normalizedQuery),
            searchIn('users', ['displayName', 'username'], normalizedQuery),
            searchIn('quizzes', ['question'], normalizedQuery)
        ]).then(results => {
            const allResults = [].concat.apply([], results);
            allResults.sort((a, b) => b.score - a.score);
            displayResults(allResults);
        });
    } else {
        searchQuerySpan.textContent = '';
        searchResultsContainer.innerHTML = '<p>Vui lòng nhập từ khóa để tìm kiếm.</p>';
    }

    function searchIn(refName, fields, normalizedQuery) {
        const ref = firebase.database().ref(refName);
        const queryRegex = new RegExp(normalizedQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');

        return ref.once('value').then(snapshot => {
            const results = [];
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const item = { ...childSnapshot.val(), id: childSnapshot.key, type: refName };
                    let score = 0;

                    for (const field of fields) {
                        if (item[field] && typeof item[field] === 'string') {
                            const processedField = item[field].trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                            const matches = processedField.match(queryRegex) || [];
                            score += matches.length;
                        }
                    }

                    if (score > 0) {
                        item.score = score;
                        results.push(item);
                    }
                });
            }
            return results;
        });
    }

    function displayResults(results) {
        searchResultsContainer.innerHTML = '';
        if (results.length > 0) {
            results.forEach(item => {
                let title, link, content, siteName;

                switch (item.type) {
                    case 'posts':
                        title = item.description.substring(0, 100) + (item.description.length > 100 ? '...' : '');
                        link = `detail.html?id=${item.id}`;
                        content = (item.description || '').substring(0, 150) + '...';
                        siteName = 'Bài viết';
                        break;
                    case 'users':
                        title = item.displayName || item.username;
                        link = `wall.html?id=${item.id}`;
                        content = `Trang cá nhân của ${title}`;
                        siteName = 'Người dùng';
                        break;
                    case 'quizzes':
                        title = item.question;
                        link = `quiz-detail.html?id=${item.id}`;
                        content = `Câu hỏi trắc nghiệm`;
                        siteName = 'Trắc nghiệm';
                        break;
                }

                const resultCard = document.createElement('div');
                resultCard.className = 'search-result-card';

                const faviconUrl = './favicon.png'; 
                const domain = window.location.hostname;

                resultCard.innerHTML = `
                    <div class="result-header">
                        <img src="${faviconUrl}" class="result-favicon" alt="favicon">
                        <div class="result-source">
                            <div class="result-site-name">${siteName}</div>
                            <div class="result-url">${domain} > ${item.type}</div>
                        </div>
                    </div>
                    <h3 class="result-title"><a href="${link}">${title}</a></h3>
                    <p class="result-description">${content}</p>
                `;
                searchResultsContainer.appendChild(resultCard);
            });
        } else {
            searchResultsContainer.innerHTML = '<p>Không tìm thấy kết quả nào.</p>';
        }
    }

});
