document.addEventListener('DOMContentLoaded', function() {
    // Function to fetch all wall posts from all users
    function fetchAllWallPosts() {
        const postsRef = firebase.database().ref('wall_posts');
        postsRef.on('value', (snapshot) => {
            const allPosts = [];
            snapshot.forEach((postSnapshot) => {
                const post = postSnapshot.val();
                post.id = postSnapshot.key;
                post.authorId = post.uid; // Correctly get authorId from post data
                if (post.authorId) { // Only add posts that have an author
                    allPosts.push(post);
                }
            });

            // Sort posts by timestamp in descending order
            allPosts.sort((a, b) => b.timestamp - a.timestamp);

            displayPosts(allPosts);
        });
    }

    // Function to fetch user data
    async function fetchUserData(userId) {
        const userRef = firebase.database().ref('users/' + userId);
        const snapshot = await userRef.once('value');
        return snapshot.val();
    }

    // Function to display posts
    async function displayPosts(posts) {
        const postsContainer = document.getElementById('wall-posts-container');
        postsContainer.innerHTML = ''; // Clear previous posts

        for (const post of posts) {
            const authorData = await fetchUserData(post.authorId);
            const authorName = authorData ? authorData.displayName : 'Unknown User';
            const authorAvatar = authorData ? authorData.photoURL : 'https://via.placeholder.com/40';

            const postElement = document.createElement('div');
            postElement.classList.add('post');
            postElement.setAttribute('data-post-id', post.id);
            postElement.setAttribute('data-author-id', post.authorId);

            const likesCount = post.likes ? Object.keys(post.likes).length : 0;
            const commentsCount = post.comments ? Object.keys(post.comments).length : 0;

            let commentsHTML = '<div class="comments-container" style="display: none;">';
            if (post.comments) {
                for (const commentId in post.comments) {
                    const comment = post.comments[commentId];
                    const commentAuthorData = await fetchUserData(comment.uid);
                    const commentAuthorName = commentAuthorData ? commentAuthorData.displayName : 'Unknown User';
                    const commentAuthorAvatar = commentAuthorData ? commentAuthorData.photoURL : 'https://via.placeholder.com/30';
                    commentsHTML += `
                        <div class="comment">
                            <a href="wall.html?id=${comment.uid}">
                                <img src="${commentAuthorAvatar}" alt="Avatar" class="comment-avatar">
                            </a>
                            <div class="comment-content">
                                <p><strong><a href="wall.html?id=${comment.uid}">${commentAuthorName}</a>:</strong> ${comment.text}</p>
                                ${comment.imageUrl ? `<img src="${comment.imageUrl}" alt="Comment image" class="comment-image">` : ''}
                            </div>
                        </div>`;
                }
            }
            commentsHTML += '</div>';
            
            let mediaHTML = '';
            if (post.imageUrl) {
                mediaHTML += `<img src="${post.imageUrl}" alt="Post image" style="max-width: 100%; border-radius: 8px; margin-top: 10px;">`;
            }
            if (post.youtubeUrl) {
                const videoId = getYouTubeVideoId(post.youtubeUrl);
                if (videoId) {
                    mediaHTML += `<div class="youtube-embed-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; margin-top: 10px;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
                }
            }

            postElement.innerHTML = `
                <div class="post-header">
                    <a href="wall.html?id=${post.authorId}">
                        <img src="${authorAvatar}" alt="Avatar" class="post-avatar">
                    </a>
                    <div class="post-info">
                        <a href="wall.html?id=${post.authorId}">${authorName}</a>
                        <small>${new Date(post.timestamp).toLocaleString()}</small>
                    </div>
                </div>
                <p>${post.text}</p>
                ${mediaHTML}
                <div class="post-actions">
                    <button class="like-btn"><i class="fas fa-thumbs-up"></i> Like (${likesCount})</button>
                    <button class="comment-btn"><i class="fas fa-comment"></i> Comment (${commentsCount})</button>
                </div>
                ${commentsHTML}
                <div class="comment-input-container" style="display: none;">
                    <input type="text" class="comment-input" placeholder="Write a comment...">
                    <label class="comment-image-label" for="comment-image-input-${post.id}"><i class="fas fa-camera"></i></label>
                    <input type="file" id="comment-image-input-${post.id}" class="comment-image-input" accept="image/*" style="display: none;">
                    <button class="submit-comment-btn">Submit</button>
                </div>
            `;
            postsContainer.appendChild(postElement);
        }
    }
    
    function getYouTubeVideoId(url) {
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|watch\?v=|v\/|embed\/)|youtu\.be\/)([^"&?\/\s]{11})/;        
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    // Event delegation for like and comment buttons
    document.getElementById('wall-posts-container').addEventListener('click', function(e) {
        const currentUserId = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
        if (!currentUserId) {
            alert('Please log in to interact with posts.');
            return;
        }

        const postElement = e.target.closest('.post');
        if (!postElement) return;

        const postId = postElement.getAttribute('data-post-id');

        if (e.target.closest('.like-btn')) {
            const postRef = firebase.database().ref(`wall_posts/${postId}/likes/${currentUserId}`);
            postRef.once('value', (snapshot) => {
                if (snapshot.exists()) {
                    postRef.remove(); // Unlike
                } else {
                    postRef.set(true); // Like
                }
            });
        }

        if (e.target.closest('.comment-btn')) {
            const commentsContainer = postElement.querySelector('.comments-container');
            const commentInputContainer = postElement.querySelector('.comment-input-container');
            
            if (commentsContainer.style.display === 'none') {
                commentsContainer.style.display = 'block';
                commentInputContainer.style.display = 'flex';
                commentsContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
            } else {
                commentsContainer.style.display = 'none';
                commentInputContainer.style.display = 'none';
            }
        }

        if (e.target.closest('.submit-comment-btn')) {
            const commentInput = postElement.querySelector('.comment-input');
            const imageInput = postElement.querySelector('.comment-image-input');
            const commentText = commentInput.value.trim();
            const imageFile = imageInput.files[0];

            if (commentText || imageFile) {
                const userRef = firebase.database().ref(`users/${currentUserId}`);
                userRef.once('value', (snapshot) => {
                    const userData = snapshot.val();
                    const commentsRef = firebase.database().ref(`wall_posts/${postId}/comments`);
                    const newCommentRef = commentsRef.push();
                    const newCommentId = newCommentRef.key;

                    const commentData = {
                        uid: currentUserId,
                        text: commentText,
                        timestamp: firebase.database.ServerValue.TIMESTAMP,
                        displayName: userData.displayName || 'Anonymous',
                        photoURL: userData.photoURL || 'https://via.placeholder.com/30'
                    };

                    if (imageFile) {
                        const storageRef = firebase.storage().ref(`comment_images/${postId}/${newCommentId}/${imageFile.name}`);
                        storageRef.put(imageFile).then(snapshot => {
                            snapshot.ref.getDownloadURL().then(downloadURL => {
                                commentData.imageUrl = downloadURL;
                                newCommentRef.set(commentData);
                            });
                        });
                    } else {
                        newCommentRef.set(commentData);
                    }

                    commentInput.value = '';
                    imageInput.value = '';
                    postElement.querySelector('.comment-input-container').style.display = 'none';
                });
            }
        }
    });

    // Initial fetch of all wall posts
    fetchAllWallPosts();
});