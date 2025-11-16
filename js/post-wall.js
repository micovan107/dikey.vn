document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const db = firebase.database();

    const postWallForm = document.getElementById('post-wall-form');

    let currentUser = null;

    function escapeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, function(match) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[match];
        });
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
        } else {
            window.location.href = 'login.html';
        }
    });

    const adminEmails = ['micovan108@gmail.com', 'micovan105@gmail.com'];

    postWallForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const text = document.getElementById('post-text').value;
        const imageUrl = document.getElementById('post-image-url').value;
        const youtubeUrl = document.getElementById('post-youtube-url').value;

        if (!text && !imageUrl && !youtubeUrl) {
            alert('Bạn phải nhập ít nhất một nội dung nào đó!');
            return;
        }

        const isCurrentUserAdmin = adminEmails.includes(currentUser.email);

        const newPostRef = db.ref('wall_posts').push();
        newPostRef.set({
            uid: currentUser.uid,
            text: isCurrentUserAdmin ? text : escapeHTML(text),
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