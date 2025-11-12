document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();
    const db = firebase.database();

    // --- DOM Elements ---
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");
    const profileScore = document.getElementById("profile-score");
    const profileAvatar = document.getElementById("profile-avatar");
    const userPostsList = document.getElementById("user-posts-list");
    const achievementsList = document.getElementById("achievements-list");
    const addFriendBtn = document.getElementById("add-friend-btn");
    const followBtn = document.getElementById("follow-btn");
    const rateBtn = document.getElementById("rate-btn");
    const editProfileLink = document.querySelector('a[href="edit-profile.html"]');
    const profileActions = document.querySelector('.profile-actions');
    const wallPostsContainer = document.getElementById('wall-posts-container');

    // --- State ---
    let currentUser = null;
    let viewedUserId = null;

    // --- Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    viewedUserId = urlParams.get('id'); // Changed from 'uid' to 'id' for consistency

    auth.onAuthStateChanged(user => {
        currentUser = user;
        const profileUserId = viewedUserId || (currentUser ? currentUser.uid : null);

        if (!profileUserId) {
            window.location.href = 'login.html';
            return;
        }

        // If URL is empty, redirect to own wall
        if (!viewedUserId && currentUser) {
            window.location.search = `?id=${currentUser.uid}`;
            return; // Important to avoid running the rest of the code before redirect
        }

        loadUserProfile(profileUserId);
        loadWallPosts(profileUserId);
        loadForumPosts(profileUserId);
        loadAchievements(); // Assuming generic achievements for now
        loadFriends(profileUserId);
        loadFollowers(profileUserId);
        loadGifts(profileUserId);
        setupActionButtons(profileUserId);
        setupTabs();

        const giftCoinsBtn = document.getElementById('gift-coins-btn');
        if (giftCoinsBtn) {
            giftCoinsBtn.addEventListener('click', function(e) {
                e.preventDefault(); 
                if (viewedUserId) {
                    const userRef = db.ref(`users/${viewedUserId}`);
                    userRef.once('value', (snapshot) => {
                        const userData = snapshot.val();
                        if (userData && userData.displayName) {
                            const recipientName = encodeURIComponent(userData.displayName);
                            window.location.href = `gift-xu.html?recipientId=${viewedUserId}&recipientName=${recipientName}`;
                        } else {
                             window.location.href = 'gift-xu.html';
                        }
                    });
                } else {
                    window.location.href = 'gift-xu.html';
                }
            });
        }
    });

    // --- Data Loading Functions ---
    function loadUserProfile(userId) {
        const userRef = db.ref(`users/${userId}`);
        userRef.on('value', (snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                document.title = `${userData.displayName || 'User'} - Tường Nhà`;
                profileName.textContent = userData.displayName || 'N/A';
                profileEmail.textContent = userData.email;
                profileAvatar.src = userData.photoURL || 'https://via.placeholder.com/150';
                profileScore.textContent = userData.score || 0;

                if (userData.averageRating) {
                    let ratingElement = document.getElementById('profile-rating-container');
                    if (!ratingElement) {
                        ratingElement = document.createElement('p');
                        ratingElement.id = 'profile-rating-container';
                        profileScore.parentElement.insertAdjacentElement('afterend', ratingElement);
                    }
                    ratingElement.innerHTML = `Đánh giá: <span id="profile-rating">${userData.averageRating.toFixed(1)}/5 <i class="fas fa-star"></i></span>`;
                }
            } else {
                // Handle user not found
                profileName.textContent = "Người dùng không tồn tại";
            }
        });
    }

    function loadWallPosts(userId) {
        const postsRef = db.ref('wall_posts').orderByChild('uid').equalTo(userId);
        postsRef.on('value', (snapshot) => {
            wallPostsContainer.innerHTML = '';
            if (!snapshot.exists()) {
                wallPostsContainer.innerHTML = '<p>Chưa có bài đăng nào trên tường.</p>';
                return;
            }
            snapshot.forEach((childSnapshot) => {
                const post = childSnapshot.val();
                const postElement = createWallPostElement(post, childSnapshot.key);
                wallPostsContainer.prepend(postElement);
            });
        });
    }

    function loadForumPosts(userId) {
        const userPostsRef = db.ref('posts').orderByChild('userId').equalTo(userId);
        userPostsRef.on('value', (snapshot) => {
            userPostsList.innerHTML = '';
            if (!snapshot.exists()) {
                userPostsList.innerHTML = '<p>Chưa có bài đăng diễn đàn nào.</p>';
                return;
            }
            snapshot.forEach((childSnapshot) => {
                const post = childSnapshot.val();
                const postId = childSnapshot.key;
                const postElement = document.createElement('div');
                postElement.classList.add('post-item-mini');
                postElement.innerHTML = `<h4><a href="detail.html?id=${postId}">${post.title}</a></h4><p>Môn học: ${post.subject}</p>`;
                userPostsList.appendChild(postElement);
            });
        });
    }

    function loadAchievements() {
        const achievementsRef = db.ref('achievements');
        achievementsRef.on('value', (snapshot) => {
            achievementsList.innerHTML = '';
            if (!snapshot.exists()) {
                achievementsList.innerHTML = '<p>Chưa có thành tích nào.</p>';
                return;
            }
            snapshot.forEach((childSnapshot) => {
                const achievement = childSnapshot.val();
                const achievementElement = document.createElement('div');
                achievementElement.classList.add('achievement-item');
                achievementElement.innerHTML = `<i class="${achievement.icon}"></i><div><h4>${achievement.title}</h4><p>${achievement.description}</p></div>`;
                achievementsList.appendChild(achievementElement);
            });
        });
    }

    function loadFriends(userId) {
        const friendsRef = db.ref(`users/${userId}/friends`);
        friendsRef.on('value', snapshot => {
            const friendsList = document.getElementById('friends-list');
            friendsList.innerHTML = '';
            if (snapshot.exists()) {
                snapshot.forEach(friendSnap => {
                    const friendId = friendSnap.key;
                    db.ref(`users/${friendId}`).once('value', userSnap => {
                        const userData = userSnap.val();
                        if (userData) {
                            const friendElement = createUserItemElement(friendId, userData);
                            friendsList.appendChild(friendElement);
                        }
                    });
                });
            } else {
                friendsList.innerHTML = '<p>Chưa có bạn bè nào.</p>';
            }
        });
    }

    function loadFollowers(userId) {
        const followersRef = db.ref(`users/${userId}/followers`);
        followersRef.on('value', snapshot => {
            const followersList = document.getElementById('followers-list');
            followersList.innerHTML = '';
            if (snapshot.exists()) {
                snapshot.forEach(followerSnap => {
                    const followerId = followerSnap.key;
                    db.ref(`users/${followerId}`).once('value', userSnap => {
                        const userData = userSnap.val();
                        if (userData) {
                            const followerElement = createUserItemElement(followerId, userData);
                            followersList.appendChild(followerElement);
                        }
                    });
                });
            } else {
                followersList.innerHTML = '<p>Chưa có người theo dõi nào.</p>';
            }
        });
    }

    function loadGifts(userId) {
        const giftsRef = db.ref(`users/${userId}/gifts`);
        giftsRef.on('value', snapshot => {
            const giftsList = document.getElementById('gifts-list');
            giftsList.innerHTML = '';
            if (snapshot.exists()) {
                snapshot.forEach(giftSnap => {
                    const giftId = giftSnap.key;
                    const gift = giftSnap.val();
                    const giftElement = document.createElement('div');
                    giftElement.classList.add('col-md-4', 'col-sm-6');
                    let sellButtonHTML = '';
                    if (currentUser && userId === currentUser.uid) {
                        sellButtonHTML = `<button class="btn btn-primary sell-gift-btn" data-gift-id="${giftId}" data-quantity="${gift.quantity}" data-price="${gift.price}">Bán</button>`;
                    }

                    giftElement.innerHTML = `
                        <div class="card mb-4">
                            <img src="${gift.itemImage}" class="card-img-top" alt="${gift.itemName}">
                            <div class="card-body">
                                <h5 class="card-title">${gift.itemName}</h5>
                                <p class="card-text">Số lượng: ${gift.quantity}</p>
                                ${sellButtonHTML}
                            </div>
                        </div>
                    `;
                    giftsList.appendChild(giftElement);
                });
            } else {
                giftsList.innerHTML = '<p>Chưa có quà tặng nào.</p>';
            }
        });
    }

    // --- UI Element Creation ---
    function createWallPostElement(post, postId) {
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
                contentHTML += `<div class="youtube-embed-container"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
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

    function createUserItemElement(userId, userData) {
        const userElement = document.createElement('div');
        userElement.classList.add('user-item');
        userElement.innerHTML = `
            <a href="wall.html?id=${userId}">
                <img src="${userData.photoURL || 'https://via.placeholder.com/50'}" alt="${userData.displayName}">
                <span>${userData.displayName}</span>
            </a>
        `;
        return userElement;
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
                    <img src="${comment.photoURL || 'https://i.pravatar.cc/30'}" alt="Avatar" class="comment-avatar">
                    <div class="comment-content">
                        <strong><a href="wall.html?id=${comment.uid}">${comment.displayName}</a>:</strong>
                        <span>${comment.text}</span>
                    </div>
                `;
                container.appendChild(commentElement);
            });
        });
    }

    // --- Action Button & Tab Setup ---
    function setupActionButtons(profileUserId) {
        if (currentUser && currentUser.uid === profileUserId) {
            profileActions.style.display = 'none';
            editProfileLink.style.display = 'block';
        } else if (currentUser) {
            profileActions.style.display = 'block';
            editProfileLink.style.display = 'none';
            setupFollowButton(profileUserId);
            setupFriendButton(profileUserId);
            setupRating(profileUserId);
            setupGiftCoinsButton(profileUserId);
        } else { // Not logged in
            profileActions.style.display = 'none';
            editProfileLink.style.display = 'none';
        }
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.tab-link');
        const tabContents = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    // --- Button Logic ---
    function setupFollowButton(profileUserId) {
        const currentUserId = currentUser.uid;
        const followingRef = db.ref(`users/${currentUserId}/following/${profileUserId}`);

        followingRef.on('value', snapshot => {
            if (snapshot.exists()) {
                followBtn.innerHTML = '<i class="fas fa-check"></i> Đang theo dõi';
                followBtn.classList.add('active');
            } else {
                followBtn.innerHTML = '<i class="fas fa-rss"></i> Theo dõi';
                followBtn.classList.remove('active');
            }
        });

        followBtn.onclick = () => {
            followingRef.once('value', snapshot => {
                if (snapshot.exists()) {
                    db.ref(`users/${currentUserId}/following/${profileUserId}`).remove();
                    db.ref(`users/${profileUserId}/followers/${currentUserId}`).remove();
                } else {
                    db.ref(`users/${currentUserId}/following/${profileUserId}`).set(true);
                    db.ref(`users/${profileUserId}/followers/${currentUserId}`).set(true);
                }
            });
        };
    }

    function setupGiftCoinsButton(profileUserId) {
        const giftCoinsBtn = document.getElementById('gift-coins-btn');
        giftCoinsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const recipientName = profileName.textContent;
            window.location.href = `gift-coins.html?recipient=${encodeURIComponent(recipientName)}`;
        });
    }

    function setupFriendButton(profileUserId) {
        const currentUserId = currentUser.uid;
        const friendRef = db.ref(`users/${currentUserId}/friends/${profileUserId}`);
        const requestSentRef = db.ref(`friend_requests/${profileUserId}/${currentUserId}`);
        const requestReceivedRef = db.ref(`friend_requests/${currentUserId}/${profileUserId}`);

        const updateStatus = () => {
            friendRef.once('value', snap1 => {
                if (snap1.exists()) {
                    addFriendBtn.innerHTML = '<i class="fas fa-user-check"></i> Bạn bè';
                    addFriendBtn.disabled = true;
                    addFriendBtn.onclick = null;
                } else {
                    requestSentRef.once('value', snap2 => {
                        if (snap2.exists()) {
                            addFriendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Đã gửi yêu cầu';
                            addFriendBtn.disabled = true;
                            addFriendBtn.onclick = null;
                        } else {
                            requestReceivedRef.once('value', snap3 => {
                                if (snap3.exists()) {
                                    addFriendBtn.innerHTML = '<i class="fas fa-user-plus"></i> Chấp nhận lời mời';
                                    addFriendBtn.disabled = false;
                                    addFriendBtn.onclick = () => acceptFriendRequest(currentUserId, profileUserId);
                                } else {
                                    addFriendBtn.innerHTML = '<i class="fas fa-user-plus"></i> Kết bạn';
                                    addFriendBtn.disabled = false;
                                    addFriendBtn.onclick = () => sendFriendRequest(currentUserId, profileUserId);
                                }
                            });
                        }
                    });
                }
            });
        };

        db.ref(`users/${currentUserId}/friends`).on('value', updateStatus);
        db.ref(`friend_requests/${profileUserId}`).on('value', updateStatus);
        db.ref(`friend_requests/${currentUserId}`).on('value', updateStatus);
    }

    function setupRating(profileUserId) {
        const ratingSection = document.getElementById('rating-section');
        const ratingsRef = db.ref(`users/${profileUserId}/ratings`);

        ratingsRef.on('value', snapshot => {
            const ratings = snapshot.val() || {};
            const ratingValues = Object.values(ratings);
            const ratingCount = ratingValues.length;
            const totalStars = ratingValues.reduce((sum, val) => sum + val, 0);
            const averageRating = ratingCount > 0 ? (totalStars / ratingCount).toFixed(1) : 0;

            const ratingCountsByStar = {
                1: 0, 2: 0, 3: 0, 4: 0, 5: 0
            };
            ratingValues.forEach(val => {
                if (val >= 1 && val <= 5) {
                    ratingCountsByStar[val]++;
                }
            });

            let ratingDetailsHTML = '';
            for (let i = 5; i >= 1; i--) {
                ratingDetailsHTML += `
                    <tr>
                        <td>${i} sao</td>
                        <td> - ${ratingCountsByStar[i]} đánh giá</td>
                    </tr>
                `;
            }

            const currentUser = auth.currentUser;
            const isCurrentUser = currentUser && currentUser.uid === profileUserId;

            ratingSection.innerHTML = `
                <div class="fill_all mgtop5px mgbottom5px">
                    <div class="danh_gia_wrapper">
                        <table>
                            <tbody>
                                <tr>
                                    <td width="150" align="center">
                                        <div id="ket_qua_danh_gia" class="ket_qua_danh_gia">${averageRating}</div>
                                        <div class="chu_mo"><span class="tong_danh_gia">${totalStars} sao / ${ratingCount}</span> đánh giá</div>
                                    </td>
                                    <td id="danh_gia_chi_tiet">
                                        <table class="tbl_rating">
                                            <tbody>
                                                ${ratingDetailsHTML}
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        ${!isCurrentUser ? `
                        <table width="100%">
                            <tbody>
                                <tr>
                                    <td align="center">
                                        <input name="rating" value="0" id="rating_star" type="hidden" postid="${profileUserId}" style="float: left;">
                                        <div style="line-height: 22px;" class="overall-rating">
                                            Điểm <span id="avgrat" class="xanh">${averageRating}</span> SAO trên tổng số <span class="xanh" id="totalrat">${ratingCount}</span> đánh giá<br>
                                            <span id="rating_result" class="xanh"></span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        ` : ''}
                    </div>
                </div>
            `;

            if (!isCurrentUser) {
                $("#rating_star").codexworld_rating_widget({
                    starLength: '5',
                    initialValue: '0',
                    callbackFunctionName: 'processRating',
                    imageDirectory: 'https://lazi.vn/uploads/icon',
                    inputAttr: 'postid'
                });
            }
        });
    }

    window.processRating = function(val, attrVal) {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert('Bạn phải đăng nhập tài khoản mới được đánh giá sao!');
            return false;
        }

        const ratingRef = db.ref(`users/${attrVal}/ratings/${currentUser.uid}`);
        ratingRef.set(val).then(() => {
            $('#rating_result').html('<img src="https://lazi.vn/uploads/icon/active_16.png"> Đánh giá ' + val + ' SAO thành công, Xin cảm ơn!');
        }).catch(error => {
            alert('Có lỗi xảy ra, vui lòng thử lại sau!');
        });
    }

    function updateAverageRating(profileUserId) {
        // This function is now handled by the setupRating function's 'on' listener
    }



    function sendFriendRequest(fromId, toId) {
        db.ref(`friend_requests/${toId}/${fromId}`).set({ status: 'pending', from: fromId, timestamp: Date.now() })
            .then(() => console.log("Friend request sent."));
    }

    function acceptFriendRequest(currentUserId, requestingUserId) {
        const updates = {};
        updates[`/users/${currentUserId}/friends/${requestingUserId}`] = true;
        updates[`/users/${requestingUserId}/friends/${currentUserId}`] = true;
        updates[`/friend_requests/${currentUserId}/${requestingUserId}`] = null;
        db.ref().update(updates).then(() => console.log("Friend request accepted."));
    }

    function updateAverageRating(userId) {
        const ratingsRef = db.ref(`users/${userId}/ratings`);
        ratingsRef.once('value', snapshot => {
            if (snapshot.exists()) {
                const ratings = snapshot.val();
                const ratingValues = Object.values(ratings);
                const sum = ratingValues.reduce((a, b) => a + b, 0);
                const average = sum / ratingValues.length;
                db.ref(`users/${userId}/averageRating`).set(average);
            }
        });
    }

    function addComment(postId, text) {
        if (!currentUser) return;

        const userRef = db.ref(`users/${currentUser.uid}`);
        userRef.once('value', (snapshot) => {
            const userData = snapshot.val();
            if (!userData) {
                console.error("Could not find user data for current user.");
                return;
            }

            const commentsRef = db.ref(`wall_posts/${postId}/comments`);
            const newCommentRef = commentsRef.push();
            newCommentRef.set({
                uid: currentUser.uid,
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                displayName: userData.displayName || "Người dùng ẩn danh",
                photoURL: userData.photoURL || 'https://via.placeholder.com/30'
            });
        });
    }

    function getYouTubeVideoId(url) {
        const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|watch\?v=|v\/|embed\/)|youtu\.be\/)([^"&?\/\s]{11})/;        
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    const giftsList = document.getElementById('gifts-list');
    if (giftsList) {
        giftsList.addEventListener('click', (event) => {
            if (event.target.classList.contains('sell-gift-btn')) {
                const giftId = event.target.dataset.giftId;
                const quantity = parseInt(event.target.dataset.quantity);
                const price = parseInt(event.target.dataset.price);
                const currentUser = firebase.auth().currentUser;

                if (currentUser) {
                    const userId = currentUser.uid;
                    const confirmation = confirm(`Bạn có chắc chắn muốn bán vật phẩm này với giá ${price} xu không?`);

                    if (confirmation) {
                        const userGiftRef = firebase.database().ref(`users/${userId}/gifts/${giftId}`);
                        const userXuRef = firebase.database().ref(`users/${userId}/xu`);

                        userXuRef.transaction((currentXu) => {
                            return (currentXu || 0) + price;
                        });

                        if (quantity > 1) {
                            userGiftRef.update({ quantity: quantity - 1 });
                        } else {
                            userGiftRef.remove();
                        }
                    }
                }
            }
        });
    }
});