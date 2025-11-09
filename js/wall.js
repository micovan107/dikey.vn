document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const db = firebase.database();

    const wallAvatar = document.getElementById('wall-avatar');
    const wallUsername = document.getElementById('wall-username');
    const wallPostsContainer = document.getElementById('wall-posts-container');
    const wallActions = document.getElementById('wall-actions');

    let currentUser = null;
    let wallUserUid = null;

    const urlParams = new URLSearchParams(window.location.search);
    wallUserUid = urlParams.get('uid');

    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (wallUserUid) {
            loadUserProfile(wallUserUid);
            loadWallPosts(wallUserUid);
            setupWallActions();
        } else if (currentUser) {
            window.location.search = `?uid=${currentUser.uid}`;
        } else {
            window.location.href = 'login.html';
        }
    });

    function loadUserProfile(uid) {
        const userRef = db.ref(`users/${uid}`);
        userRef.once('value', (snapshot) => {
            const user = snapshot.val();
            if (user) {
                document.title = `${user.displayName} - Tường Nhà`;
                wallAvatar.src = user.photoURL || 'https://i.pravatar.cc/150';
                wallUsername.textContent = user.displayName || user.email.split('@')[0];
            }
        });
    }

    function setupWallActions() {
        if (currentUser && currentUser.uid === wallUserUid) {
            wallActions.innerHTML = `<a href="post-wall.html" class="nav-button">Tạo bài đăng</a>`;
        }
    }

    function loadWallPosts(uid) {
        const postsRef = db.ref('wall_posts').orderByChild('uid').equalTo(uid);
        postsRef.on('value', (snapshot) => {
            wallPostsContainer.innerHTML = '';
            if (!snapshot.exists()) {
                wallPostsContainer.innerHTML = '<p>Chưa có bài đăng nào.</p>';
                return;
            }
            snapshot.forEach((childSnapshot) => {
                const post = childSnapshot.val();
                const postElement = createPostElement(post, childSnapshot.key);
                wallPostsContainer.prepend(postElement);
            });
        });
    }

    function createPostElement(post, postId) {
        const postDiv = document.createElement('div');
        postDiv.classList.add('post-item');

        let contentHTML = '';
        if (post.text) {
            contentHTML += `<p>${post.text.replace(/\n/g, '<br>')}</p>`;
        }
        if (post.imageUrl) {
            contentHTML += `<img src="${post.imageUrl}" alt="Ảnh bài đăng" class="wall-post-image">`;
        }
        if (post.youtubeUrl) {
            const videoId = getYouTubeVideoId(post.youtubeUrl);
            if (videoId) {
                contentHTML += `<div class="youtube-embed-container">
                                  <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                               </div>`;
            }
        }

        postDiv.innerHTML = `
            <div class="post-content">
                ${contentHTML}
                <p class="post-meta">Đăng lúc ${new Date(post.timestamp).toLocaleString()}</p>
            </div>
            <div class="post-comments" id="comments-${postId}">
                <h4>Bình luận</h4>
                <form class="comment-form" data-post-id="${postId}">
                    <textarea placeholder="Viết bình luận..." required></textarea>
                    <button type="submit">Gửi</button>
                </form>
                <div class="comment-list"></div>
            </div>
        `;

        loadComments(postId, postDiv.querySelector('.comment-list'));

        const commentForm = postDiv.querySelector('.comment-form');
        commentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUser) {
                alert('Bạn cần đăng nhập để bình luận.');
                return;
            }
            const commentText = e.target.querySelector('textarea').value;
            addComment(postId, commentText);
            e.target.querySelector('textarea').value = '';
        });

        return postDiv;
    }

    function getYouTubeVideoId(url) {
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|watch\?v=|v\/|embed\/)|youtu\.be\/)([^"&?\/\s]{11})/;        const match = url.match(regex);
        return match ? match[1] : null;
    }

    function addComment(postId, text) {
        const commentRef = db.ref(`wall_posts/${postId}/comments`);
        const newCommentRef = commentRef.push();
        newCommentRef.set({
            uid: currentUser.uid,
            displayName: currentUser.displayName || currentUser.email.split('@')[0],
            photoURL: currentUser.photoURL || 'https://i.pravatar.cc/30',
            text: text,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }

    function loadComments(postId, container) {
        const commentsRef = db.ref(`wall_posts/${postId}/comments`).orderByChild('timestamp');
        commentsRef.on('value', (snapshot) => {
            container.innerHTML = '';
            snapshot.forEach((childSnapshot) => {
                const comment = childSnapshot.val();
                const commentElement = document.createElement('div');
                commentElement.classList.add('comment-item');
                commentElement.innerHTML = `
                    <img src="${comment.photoURL}" alt="Avatar" class="comment-avatar">
                    <div class="comment-content">
                        <strong><a href="wall.html?uid=${comment.uid}">${comment.displayName}</a>:</strong>
                        <span>${comment.text}</span>
                    </div>
                `;
                container.appendChild(commentElement);
            });
        });
    }
});