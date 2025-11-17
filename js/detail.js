document.addEventListener("DOMContentLoaded", () => {
    const postDetailContainer = document.getElementById("post-detail-container");
    const solutionsContainer = document.getElementById("solutions-container");
    const addSolutionLink = document.getElementById("add-solution-link");
    const addSolutionButtonContainer = document.getElementById("add-solution-button-container");

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        postDetailContainer.innerHTML = "<p>Không tìm thấy bài tập. Vui lòng quay lại trang chủ.</p>";
        return;
    }

    let postAuthorId = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            if (postAuthorId && user.uid === postAuthorId) {
                addSolutionButtonContainer.style.display = 'none';
            } else {
                addSolutionButtonContainer.style.display = 'block';
                addSolutionLink.href = `post-solution.html?id=${postId}`;
            }
        } else {
            addSolutionButtonContainer.style.display = 'none';
        }
    });

    const postRef = db.ref('posts/' + postId);
    postRef.get().then((snapshot) => {
        if (snapshot.exists()) {
            const post = snapshot.val();
            postAuthorId = post.authorId;

            const viewedPosts = JSON.parse(sessionStorage.getItem('viewedPosts') || '{}');
            if (!viewedPosts[postId]) {
                const viewRef = db.ref('posts/' + postId + '/viewCount');
                viewRef.transaction((currentViews) => (currentViews || 0) + 1);
                viewedPosts[postId] = true;
                sessionStorage.setItem('viewedPosts', JSON.stringify(viewedPosts));
            }

            document.title = `Chi tiết: ${post.description.substring(0, 50)}...`;
            const postDate = post.createdAt ? new Date(post.createdAt).toLocaleString('vi-VN') : 'Không rõ ngày';
            let imageHtml = post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="img-fluid rounded my-3">` : '';

            const authorRef = db.ref('users/' + post.authorId);
            authorRef.get().then((authorSnapshot) => {
                const author = authorSnapshot.val() || { email: post.authorEmail };
                const authorDisplayName = author.displayName || author.email.split('@')[0];
                const authorPhotoURL = author.photoURL || 'https://i.pravatar.cc/40';

                postDetailContainer.innerHTML = `
                    <p class="post-meta">
                        Đăng bởi: 
                        <a href="wall.html?id=${post.authorId}" class="post-user-link">
                            <img src="${authorPhotoURL}" alt="Avatar" class="post-avatar">
                            <span>${authorDisplayName}</span>
                        </a>
                        vào lúc ${postDate} | ${post.viewCount || 0} lượt xem
                    </p>
                    <div class="post-description">${post.description.replace(/\n/g, '<br>')}</div>
                    ${imageHtml}
                `;

                const postAuthorInfo = document.getElementById('post-author-info');
                if (postAuthorInfo) {
                    postAuthorInfo.innerHTML = `
                        <a href="gift-coins.html?recipient=${post.authorId}" class="btn btn-primary">Tặng xu</a>
                    `;
                }
            });

            loadSolutions();

        } else {
            postDetailContainer.innerHTML = "<p>Bài tập không tồn tại hoặc đã bị xóa.</p>";
        }
    }).catch(error => console.error("Lỗi tải chi tiết bài đăng: ", error));

    function loadSolutions() {
        const solutionsQuery = db.ref('solutions/' + postId).orderByChild('createdAt');
        solutionsQuery.on('value', (solutionsSnapshot) => {
            const solutionCount = solutionsSnapshot.numChildren();
            db.ref('posts/' + postId + '/replyCount').set(solutionCount);
            solutionsContainer.innerHTML = "";
            if (!solutionsSnapshot.exists()) {
                solutionsContainer.innerHTML = "<p>Chưa có lời giải nào cho bài tập này.</p>";
                return;
            }

            solutionsSnapshot.forEach(childSnapshot => {
                const solution = childSnapshot.val();
                const solutionKey = childSnapshot.key;
                renderSolution(solutionKey, solution);
            });
        });
    }

    function renderSolution(solutionKey, solution) {
        const solutionAuthorRef = db.ref(`users/${solution.authorId}`);
        solutionAuthorRef.get().then((userSnapshot) => {
            const solutionAuthor = userSnapshot.val() || {};
            const authorDisplayName = solutionAuthor.displayName || (solutionAuthor.email ? solutionAuthor.email.split('@')[0] : 'Ẩn danh');
            const authorPhotoURL = solutionAuthor.photoURL || 'https://i.pravatar.cc/40';
            const solutionDate = solution.createdAt ? new Date(solution.createdAt).toLocaleString('vi-VN') : 'Không rõ ngày';

            const commentsRef = db.ref(`comments/${solutionKey}`);
            commentsRef.get().then(commentsSnapshot => {
                const commentCount = commentsSnapshot.numChildren();

                let container = solutionsContainer.querySelector(`[data-solution-id="${solutionKey}"]`);
                if (!container) {
                    container = document.createElement('div');
                    container.classList.add('lz-table--content');
                    container.dataset.solutionId = solutionKey;
                    solutionsContainer.appendChild(container);
                }

                const fullText = solution.text.replace(/\n/g, '<br>');
                const isLongText = solution.text.length > 400;
                const displayText = isLongText ? solution.text.substring(0, 400) + '...' : fullText;
                let solutionImageHtml = solution.imageUrl ? `<img src="${solution.imageUrl}" alt="Solution image" class="img-fluid rounded my-3">` : '';

                container.innerHTML = `
                    <div class="lz-table--header">
                        <div class="lz-table-info">
                            <a href="wall.html?id=${solution.authorId}">
                                <img src="${authorPhotoURL}" alt="Avatar">
                            </a>
                            <a class="laz-table--username" target="_blank" href="wall.html?id=${solution.authorId}">${authorDisplayName}</a>
                            <div class="lz-dot"></div>
                            <div class="laz-table--time">${solutionDate}</div>
                        </div>
                        <div class="lz-table-meta" style="flex:inherit;"></div>
                    </div>
                    <div class="lz-table--body">
                        <div class="lz-table--ans content_expandable">
                            <p>${displayText}</p>
                            ${solutionImageHtml}
                        </div>
                        ${isLongText ? '<a href="#" class="expand-content-btn">Xem thêm</a>' : ''}
                    </div>
                    <div class="lz-table--footer">
                        <div class="rating_comment" style="float: none"></div>
                        <div class="lz-table--actions">
                            <a target="_blank" class="lz-table--actions_item" href="#">
                                <img src="https://lazi.vn/system/cms/themes/mytheme/new_layout/uploads/question/coins.svg">
                                <div class="lz-table--actions_text">Tặng xu</div>
                            </a>
                            <a target="_blank" class="lz-table--actions_item" href="#">
                                <img src="https://lazi.vn/system/cms/themes/mytheme/new_layout/uploads/question/gift.svg">
                                <div class="lz-table--actions_text">Tặng quà</div>
                            </a>
                            <a target="_blank" class="lz-table--actions_item" href="#">
                                <img src="https://lazi.vn/system/cms/themes/mytheme/new_layout/uploads/question/flag.svg">
                                <div class="lz-table--actions_text">Báo cáo</div>
                            </a>
                            <a class="lz-table--actions_item lz-table--actions_comment" data-id="${solutionKey}" href="javascript:void(0)">
                                <img src="https://lazi.vn/system/cms/themes/mytheme/new_layout/uploads/question/reply.svg">
                                <div class="lz-table--actions_text">Bình luận: ${commentCount}</div>
                            </a>
                        </div>
                    </div>
                    <div class="lz-clearfix"></div>
                    <div class="lz-table--comment-container" style="display: none;">
                        <div class="lz-table--comment-title" id="comment_title_${solutionKey}"></div>
                        <div class="lz-table--comment" id="comment_${solutionKey}"></div>
                        <div class="form_comment" id="form_comment_${solutionKey}">
                            <textarea id="repy_content_${solutionKey}" placeholder="Nhập nội dung ..."></textarea>
                            <button>Gửi</button>
                        </div>
                    </div>
                `;
            });
        });
    }

    function loadComments(solutionId, container) {
        const commentsRef = db.ref(`comments/${solutionId}`).orderByChild('createdAt');
        commentsRef.on('value', snapshot => {
            container.innerHTML = '';
            if (!snapshot.exists()) {
                container.innerHTML = '<p>Chưa có bình luận nào.</p>';
                return;
            }

            const comments = [];
            snapshot.forEach(child => {
                comments.push({ key: child.key, ...child.val() });
            });

            const renderComment = (comment) => {
                const commentAuthorRef = db.ref(`users/${comment.authorId}`);
                commentAuthorRef.get().then(userSnapshot => {
                    const commentAuthor = userSnapshot.val() || {};
                    const authorDisplayName = commentAuthor.displayName || (commentAuthor.email ? commentAuthor.email.split('@')[0] : 'Ẩn danh');
                    const commentDate = comment.createdAt ? new Date(comment.createdAt).toLocaleString('vi-VN') : '';

                    const commentElement = document.createElement('div');
                    commentElement.classList.add('comment-item');
                    commentElement.innerHTML = `
                        <p class="comment-author">${authorDisplayName}</p>
                        <p class="comment-text">${comment.text.replace(/\n/g, '<br>')}</p>
                        <p class="comment-meta">${commentDate}</p>
                    `;
                    container.appendChild(commentElement);
                });
            };

            if (comments.length > 10) {
                const visibleComments = comments.slice(-5);
                visibleComments.forEach(renderComment);

                const showMoreBtn = document.createElement('a');
                showMoreBtn.href = '#';
                showMoreBtn.className = 'expand-content-btn';
                showMoreBtn.textContent = `Xem thêm ${comments.length - 5} bình luận...`;
                container.prepend(showMoreBtn);

                showMoreBtn.addEventListener('click', e => {
                    e.preventDefault();
                    container.innerHTML = '';
                    comments.forEach(renderComment);
                });
            } else {
                comments.forEach(renderComment);
            }
        });
    }

    solutionsContainer.addEventListener('click', e => {
        const target = e.target;
        const solutionContent = target.closest('.lz-table--content');
        if (!solutionContent) return;

        const solutionId = solutionContent.dataset.solutionId;

        if (target.closest('.lz-table--actions_comment')) {
            e.preventDefault();
            const commentContainer = solutionContent.querySelector('.lz-table--comment-container');
            if (commentContainer) {
                const isVisible = commentContainer.style.display === 'block';
                commentContainer.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) {
                    const commentListDiv = commentContainer.querySelector('.lz-table--comment');
                    if (commentListDiv.children.length <= 1) { 
                        loadComments(solutionId, commentListDiv);
                    }
                }
            }
        }

        if (target.classList.contains('expand-content-btn')) {
            e.preventDefault();
            const contentDiv = solutionContent.querySelector('.lz-table--ans p');
            const solutionRef = db.ref(`solutions/${postId}/${solutionId}`);
            solutionRef.get().then(snapshot => {
                if (!snapshot.exists()) return;
                const solution = snapshot.val();
                const fullText = solution.text.replace(/\n/g, '<br>');
                const snippet = solution.text.substring(0, 400) + '...';

                if (target.textContent === 'Xem thêm') {
                    contentDiv.innerHTML = fullText;
                    target.textContent = 'Thu gọn';
                } else {
                    contentDiv.innerHTML = snippet;
                    target.textContent = 'Xem thêm';
                }
            });
        }

        if (target.tagName === 'BUTTON' && target.closest('.form_comment')) {
            e.preventDefault();
            const form = target.closest('.form_comment');
            const textarea = form.querySelector('textarea');
            const text = textarea.value.trim();

            const user = auth.currentUser;
            if (!user) {
                alert("Bạn cần đăng nhập để bình luận.");
                return;
            }
            if (text === '') return;

            const commentsRef = db.ref(`comments/${solutionId}`);
            const newCommentRef = commentsRef.push();
            newCommentRef.set({
                text: text,
                authorId: user.uid,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                textarea.value = '';
            }).catch(error => console.error("Lỗi gửi bình luận: ", error));
        }
    });
});