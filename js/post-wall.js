document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const db = firebase.database();

    const postWallForm = document.getElementById('post-wall-form');

    let currentUser = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
        } else {
            window.location.href = 'login.html';
        }
    });

    postWallForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const text = document.getElementById('post-text').value;
        const imageUrl = document.getElementById('post-image-url').value;
        const youtubeUrl = document.getElementById('post-youtube-url').value;

        if (!text && !imageUrl && !youtubeUrl) {
            alert('Bạn phải nhập ít nhất một nội dung nào đó!');
            return;
        }

        const newPostRef = db.ref('wall_posts').push();
        newPostRef.set({
            uid: currentUser.uid,
            text: text,
            imageUrl: imageUrl,
            youtubeUrl: youtubeUrl,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            window.location.href = `wall.html?uid=${currentUser.uid}`;
        }).catch(error => {
            console.error('Lỗi khi đăng bài:', error);
            alert('Đã có lỗi xảy ra khi đăng bài.');
        });
    });
});