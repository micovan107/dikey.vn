document.addEventListener("DOMContentLoaded", () => {
    const categoryMap = {
        'toan': 'Toán học',
        'ly': 'Vật lý',
        'hoa': 'Hóa học',
        'van': 'Ngữ văn',
        'anh': 'Tiếng Anh',
        'sinh': 'Sinh học',
        'su': 'Lịch sử',
        'dia': 'Địa lý',
        'tin': 'Tin học',
        'khac': 'Tổng hợp'
    };
    const welcomeTitles = [
        "Học, học nữa, học mãi!",
        "Tri thức là sức mạnh.",
        "Học tập là hạt giống của kiến thức, kiến thức là hạt giống của hạnh phúc.",
        "Đừng xấu hổ khi không biết, chỉ xấu hổ khi không học.",
        "Học vấn do người siêng năng đạt được, tài sản do người tinh tế sở hữu.",
            "Mỗi trang sách là một bước tiến gần hơn tới tương lai.",
    "Không có đường tắt đến thành công, chỉ có chăm chỉ và quyết tâm.",
    "Hôm nay cố gắng, ngày mai tự hào.",
    "Kiến thức không bao giờ phụ người chịu học.",
    "Thất bại chỉ là bài học, miễn là bạn không bỏ cuộc.",
    "Muốn đi nhanh thì đi một mình, muốn đi xa thì đi cùng tri thức.",
    "Sự nỗ lực hôm nay chính là thành công ngày mai.",
    "Học tập không làm bạn mệt, chỉ có lười mới khiến bạn mỏi.",
    "Mỗi giờ học trôi qua là một cơ hội để mạnh mẽ hơn.",
    "Không ai sinh ra đã giỏi, chỉ là người ta học chăm hơn bạn thôi.",
    "Học không vì điểm, học vì tương lai của chính mình.",
    "Thay vì than khó, hãy học cách chinh phục.",
    "Kiến thức có thể không nhìn thấy, nhưng nó tỏa sáng trong suy nghĩ bạn.",
    "Hãy học như thể ngày mai bạn phải dùng đến nó.",
    "Càng học càng thấy mình nhỏ bé, càng hiểu càng thấy thế giới rộng lớn.",
    "Bạn đang gặp bài khó phải không?",
    "Cố gắng lên nào, tôi tin vào bạn!",
    "Đừng để điểm kém che mờ con mắt.",
    "Đừng chỉ nhìn vào cuộc sống màu hồng của người khác mà hãy nhìn vào cách họ cố gắng để có được nó.",
   "Bạn có mệt không, xả hơi tý nào <a href='https://micovan107.github.io/dikey.vn/fun-quiz-list.html'>Đố vui</a>"

    ];

    const welcomeTitleElement = document.getElementById("welcome-title");
    if (welcomeTitleElement) {
        const randomIndex = Math.floor(Math.random() * welcomeTitles.length);
        welcomeTitleElement.innerHTML = welcomeTitles[randomIndex];
    }

    const postsContainer = document.getElementById("posts-container");
    const categoryList = document.querySelector(".category-list");
    const rankingList = document.querySelector(".ranking-list");
    const skeletonLoader = `
        <div class="post skeleton">
            <div class="post-header">
                <div class="post-avatar"></div>
                <div class="post-info">
                    <h3></h3>
                    <p class="post-meta"></p>
                </div>
            </div>
            <p></p>
            <p></p>
            <div class="post-stats">
                <span></span>
                <span></span>
            </div>
        </div>
    `;

    let selectedCategory = null;
    let selectedGrade = null;

    function showSkeletonLoaders() {
        postsContainer.innerHTML = skeletonLoader.repeat(5);
    }

    function fetchSubjects() {
        categoryList.innerHTML = '';

        const allSubjectsLi = document.createElement('li');
        allSubjectsLi.innerHTML = `<a href="#" data-id="all" class="active"><i class="fas fa-globe"></i> Tất cả</a>`;
        allSubjectsLi.addEventListener('click', (e) => {
            e.preventDefault();
            selectedCategory = null;
            selectedGrade = null;
            updateActiveFilters();
            fetchPosts();
        });
        categoryList.appendChild(allSubjectsLi);

        const categories = ["Âm nhạc", "Mỹ thuật", "Toán học", "Vật lý", "Hóa học", "Ngữ văn", "Tiếng Việt", "Tiếng Anh", "Đạo đức", "Khoa học", "Lịch sử", "Địa lý", "Sinh học", "Tin học", "Lập trình", "Công nghệ", "Giáo dục thể chất", "Giáo dục Công dân", "Giáo dục Quốc phòng và An ninh", "Ngoại ngữ khác", "Xác suất thống kê", "Tài chính tiền tệ", "Giáo dục kinh tế và pháp luật", "Hoạt động trải nghiệm", "Khoa học tự nhiên", "Khoa học xã hội", "Tự nhiên & xã hội", "Bằng lái xe", "Tổng hợp"];
        const grades = {
            "Tiểu học (Lớp 1-5)": "tieu-hoc",
            "THCS (Lớp 6-9)": "thcs",
            "THPT (Lớp 10-12)": "thpt",
            "Đại học": "dai-hoc",
            "Khác": "khac"
        };

        const categoryHeader = document.createElement('li');
        categoryHeader.classList.add('category-header');
        categoryHeader.innerHTML = 'Loại môn';
        categoryList.appendChild(categoryHeader);

        categories.forEach(category => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" data-id="category:${category}"><i class="fas fa-book"></i> ${category}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                const clickedFilter = `category:${category}`;
                selectedCategory = selectedCategory === clickedFilter ? null : clickedFilter;
                updateActiveFilters();
                fetchPosts();
            });
            categoryList.appendChild(li);
        });

        const gradeHeader = document.createElement('li');
        gradeHeader.classList.add('category-header');
        gradeHeader.innerHTML = 'Trình độ lớp';
        categoryList.appendChild(gradeHeader);

        Object.keys(grades).forEach(gradeLabel => {
            const gradeValue = grades[gradeLabel];
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" data-id="grade:${gradeValue}"><i class="fas fa-graduation-cap"></i> ${gradeLabel}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                const clickedFilter = `grade:${gradeValue}`;
                selectedGrade = selectedGrade === clickedFilter ? null : clickedFilter;
                updateActiveFilters();
                fetchPosts();
            });
            categoryList.appendChild(li);
        });
    }

    function updateActiveFilters() {
        document.querySelectorAll('.category-list li a').forEach(a => a.classList.remove('active'));

        if (!selectedCategory && !selectedGrade) {
            document.querySelector('.category-list li a[data-id="all"]').classList.add('active');
        } else {
            if (selectedCategory) {
                const el = document.querySelector(`.category-list li a[data-id="${selectedCategory}"]`);
                if (el) el.classList.add('active');
            }
            if (selectedGrade) {
                const el = document.querySelector(`.category-list li a[data-id="${selectedGrade}"]`);
                if (el) el.classList.add('active');
            }
        }
    }

    function fetchRankings() {
        const usersRef = db.ref('users').orderByChild('score').limitToLast(10);
        usersRef.on('value', snapshot => {
            rankingList.innerHTML = '';
            let rank = 1;
            const users = [];
            snapshot.forEach(childSnapshot => {
                const user = childSnapshot.val();
                user.uid = childSnapshot.key; // Make sure uid is available
                users.push(user);
            });
            users.reverse().forEach((user, index) => {
                const li = document.createElement('li');
                let crown = '';
                if (index === 0) {
                    li.classList.add('rank-gold');
                    crown = '<i class="fas fa-crown crown-gold"></i>';
                } else if (index === 1) {
                    li.classList.add('rank-silver');
                    crown = '<i class="fas fa-crown crown-silver"></i>';
                } else if (index === 2) {
                    li.classList.add('rank-bronze');
                    crown = '<i class="fas fa-crown crown-bronze"></i>';
                }

                li.innerHTML = `
                    <span class="rank">${index + 1}</span>
                    <a href="wall.html?id=${user.uid}" class="rank-user-link">
                        <div class="rank-avatar-container">
                            <img src="${user.photoURL || 'https://i.pravatar.cc/30'}" alt="Avatar" class="rank-avatar">
                            ${crown}
                        </div>
                        <span class="rank-name">${user.displayName || user.email}</span>
                    </a>
                    <span class="rank-score">${user.score || 0} <i class="fas fa-star"></i></span>
                `;
                rankingList.appendChild(li);
            });
        });
    }

    auth.onAuthStateChanged(user => {
        if (postsContainer) {
            fetchPosts();
            fetchSubjects();
            fetchRankings();
        }
    });

    function fetchPosts() {
        showSkeletonLoaders();
        let postsQuery = db.ref("posts").orderByChild("createdAt");

        postsQuery.on("value", (snapshot) => {
            postsContainer.innerHTML = "";
            if (!snapshot.exists()) {
                postsContainer.innerHTML = "<div class='empty-state'><i class='fas fa-folder-open'></i><p>Chưa có bài tập nào.</p></div>";
                return;
            }

            const posts = [];
            snapshot.forEach((childSnapshot) => {
                const post = childSnapshot.val();
                post.id = childSnapshot.key;
                posts.push(post);
            });

            let filteredPosts = posts;

            if (selectedCategory) {
                const [, value] = selectedCategory.split(':');
                filteredPosts = filteredPosts.filter(p => {
                    const postCategory = categoryMap[p.category] || p.category;
                    return postCategory === value;
                });
            }

            if (selectedGrade) {
                const [, value] = selectedGrade.split(':');
                filteredPosts = filteredPosts.filter(p => p.grade === value);
            }

            filteredPosts.reverse();

            if (filteredPosts.length === 0) {
                postsContainer.innerHTML = "<div class='empty-state'><i class='fas fa-folder-open'></i><p>Chưa có bài tập nào trong mục này.</p></div>";
                return;
            }

            filteredPosts.forEach(async (post) => {
                const postElement = document.createElement("div");
                postElement.classList.add("post");
                postElement.style.animation = 'fadeIn 0.5s ease-in-out';

                const postDate = post.createdAt ? new Date(post.createdAt).toLocaleString('vi-VN') : 'Không rõ ngày';

                const userRef = db.ref(`users/${post.authorId}`);
                const userSnapshot = await userRef.get();
                const author = userSnapshot.val() || {};
                const authorAvatar = author.photoURL || 'https://i.pravatar.cc/40';

                let imageHtml = '';
                if (post.imageUrl) {
                    imageHtml = `<a href="detail.html?id=${post.id}"><img src="${post.imageUrl}" alt="Post image" class="post-image"></a>`;
                }

                const displayCategory = categoryMap[post.category] || post.category;

                postElement.innerHTML = `
                    <div class="post-header">
                        <a href="wall.html?id=${post.authorId}">
                            <img src="${authorAvatar}" alt="Avatar" class="post-avatar">
                        </a>
                        <div class="post-info">
                            <p class="post-meta">Đăng bởi <a href="wall.html?id=${post.authorId}">${author.displayName || author.email}</a> • ${postDate}</p>
                            <p class="post-category">Môn: ${displayCategory}</p>
                        </div>
                    </div>
                    <div class="post-content">
                        <p>${post.description ? post.description.substring(0, 200) : ''}...</p>
                        ${imageHtml}
                    </div>
                    <div class="post-footer">
                         <div class="post-stats">
                            <span><i class="far fa-eye"></i> ${post.viewCount || 0} Lượt xem</span>
                            <span><i class="far fa-comments"></i> ${post.replyCount || 0} Lời giải</span>
                        </div>
                        <a href="detail.html?id=${post.id}" class="btn btn-primary btn-sm">Xem chi tiết</a>
                    </div>
                `;

                const postContent = postElement.querySelector('.post-content');
                if(postContent){
                    postContent.style.cursor = 'pointer';
                    postContent.addEventListener('click', (e) => {
                        if(e.target.tagName.toLowerCase() !== 'img' && e.target.closest('a') === null) {
                            window.location.href = `detail.html?id=${post.id}`;
                        }
                    });
                }

                postsContainer.appendChild(postElement);
            });
        }, (error) => {
            console.error("Lỗi tải bài đăng: ", error);
            postsContainer.innerHTML = "<div class='empty-state error'><i class='fas fa-exclamation-triangle'></i><p>Đã xảy ra lỗi khi tải bài tập.</p></div>";
        });
    }
});