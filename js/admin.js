document.addEventListener('DOMContentLoaded', function() {
    const db = firebase.database();
    const auth = firebase.auth();
    const adminContent = document.getElementById('admin-content');

    let adminEmails = ['micovan108@gmail.com', 'micovan105@gmail.com'];

    // Fetch sub-admins from the database and check auth status
    db.ref('subAdmins').on('value', snapshot => {
        const subAdmins = snapshot.val();
        if (subAdmins) {
            const subAdminEmails = Object.values(subAdmins).map(subAdmin => subAdmin.email);
            adminEmails = ['micovan108@gmail.com', 'micovan105@gmail.com', ...subAdminEmails];
        } else {
            adminEmails = ['micovan108@gmail.com', 'micovan105@gmail.com'];
        }
        checkAuthStatus();
    });

    function checkAuthStatus() {
        auth.onAuthStateChanged(user => {
            if (user && adminEmails.includes(user.email)) {
                // Only load content if it hasn't been loaded yet to avoid re-rendering on every auth state change
                if (!adminContent.innerHTML.includes('Quản lý người dùng')) {
                    loadAdminContent();
                }
            } else {
                adminContent.innerHTML = '<p>Bạn không có quyền truy cập trang này.</p>';
            }
        });
    }

    function loadAdminContent() {
        adminContent.innerHTML = `
            <div class="admin-section" id="user-management">
                <h2>Quản lý người dùng</h2>
                <table id="users-table">
                    <thead><tr><th>Email</th><th>Tên</th><th>Xu</th><th>Power</th><th>Health</th><th>Defense</th><th>Hành động</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
            <div class="admin-section" id="post-management">
                <h2>Quản lý bài đăng</h2>
                <table id="posts-table">
                    <thead><tr><th>Người đăng</th><th>Nội dung</th><th>Ảnh</th><th>Ngày đăng</th><th>Hành động</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
            <div class="admin-section" id="solution-management">
                <h2>Quản lý lời giải</h2>
                <table id="solutions-table">
                    <thead><tr><th>Bài đăng gốc</th><th>Người giải</th><th>Nội dung</th><th>Ảnh</th><th>Ngày giải</th><th>Hành động</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
             <div class="admin-section" id="quiz-management">
                <h2>Quản lý câu đố</h2>
                <table id="quizzes-table">
                    <thead><tr><th>Câu hỏi</th><th>Tác giả</th><th>Ngày tạo</th><th>Hành động</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
            <div class="admin-section" id="sub-admin-management">
                <h2>Quản lý Sub-Admin</h2>
                <div class="form-group">
                    <label for="sub-admin-email">Thêm Sub-Admin (Email):</label>
                    <input type="email" id="sub-admin-email" placeholder="email@example.com">
                    <button id="add-sub-admin-btn" class="btn btn-primary">Thêm</button>
                </div>
                <table id="sub-admins-table">
                    <thead><tr><th>Email</th><th>Hành động</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        `;
        loadUsers();
        loadPosts();
        loadSolutions();
        loadQuizzes();
        loadSubAdmins();

        document.getElementById('add-sub-admin-btn').addEventListener('click', addSubAdmin);
    }

    // Modal-related code
    const modal = document.getElementById('edit-modal');
    const closeButton = document.querySelector('.close-button');
    const saveButton = document.getElementById('save-edit-button');
    const editTextarea = document.getElementById('edit-textarea');
    let currentEditRef = null;
    let currentEditField = '';

    closeButton.onclick = () => modal.style.display = 'none';
    window.onclick = event => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };

    function openEditModal(ref, field, currentText) {
        currentEditRef = ref;
        currentEditField = field;
        editTextarea.value = currentText;
        modal.style.display = 'block';
    }

    saveButton.onclick = () => {
        if (currentEditRef && currentEditField) {
            const update = {};
            update[currentEditField] = editTextarea.value;
            currentEditRef.update(update)
                .then(() => {
                    modal.style.display = 'none';
                    alert('Cập nhật thành công!');
                })
                .catch(e => alert('Lỗi: ' + e.message));
        }
    };

    window.openPostEditor = function(postId) {
        window.location.href = `edit-post.html?id=${postId}`;
    };

    window.openSolutionEditor = function(postId, solutionId) {
        window.location.href = `post-solution.html?id=${postId}&solutionId=${solutionId}&edit=true`;
    };

    // Functions for User Management
    function loadUsers() {
        const usersTableBody = document.querySelector('#users-table tbody');
        db.ref('users').on('value', snapshot => {
            usersTableBody.innerHTML = '';
            snapshot.forEach(childSnapshot => {
                const userId = childSnapshot.key;
                const user = childSnapshot.val();
                const row = usersTableBody.insertRow();
                row.innerHTML = `
                    <td>${user.email}</td>
                    <td><input type="text" id="name-${userId}" value="${user.displayName || ''}"></td>
                    <td><input type="number" id="xu-${userId}" value="${user.xu || 0}"></td>
                    <td><input type="number" id="power-${userId}" value="${user.power || 0}"></td>
                    <td><input type="number" id="health-${userId}" value="${user.health || 0}"></td>
                    <td><input type="number" id="defense-${userId}" value="${user.defense || 0}"></td>
                    <td><button onclick="saveUser('${userId}')" class="btn btn-save">Lưu</button></td>
                `;
            });
        });
    }

    window.saveUser = function(userId) {
        const updates = {};
        updates['/users/' + userId + '/displayName'] = document.getElementById(`name-${userId}`).value;
        updates['/users/' + userId + '/xu'] = parseInt(document.getElementById(`xu-${userId}`).value);
        updates['/users/' + userId + '/power'] = parseInt(document.getElementById(`power-${userId}`).value);
        updates['/users/' + userId + '/health'] = parseInt(document.getElementById(`health-${userId}`).value);
        updates['/users/' + userId + '/defense'] = parseInt(document.getElementById(`defense-${userId}`).value);

        db.ref().update(updates).then(() => {
            alert('Cập nhật người dùng thành công!');
        }).catch(error => {
            alert('Lỗi cập nhật người dùng: ' + error.message);
        });
    }

    // Functions for Post Management
    function loadPosts() {
        const postsBody = document.querySelector('#posts-table tbody');
        db.ref('posts').on('value', snapshot => {
            postsBody.innerHTML = '';
            snapshot.forEach(childSnapshot => {
                const postId = childSnapshot.key;
                const post = childSnapshot.val();
                db.ref('users/' + post.authorId).once('value').then(userSnapshot => {
                    const user = userSnapshot.val();
                    const authorName = user ? user.displayName : 'N/A';
                    const row = postsBody.insertRow();
                    row.innerHTML = `
                        <td data-label="Người đăng">${authorName}</td>
                        <td data-label="Nội dung">${post.description ? post.description.substring(0, 100) + '...' : '[Chỉ có hình ảnh]'}</td>
                        <td data-label="Ảnh">${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post Image" width="100">` : ''}</td>
                        <td data-label="Ngày đăng">${new Date(post.timestamp).toLocaleString()}</td>
                        <td data-label="Hành động">
                            <button onclick="openPostEditor('${postId}')" class="btn btn-primary">Sửa</button>
                            <button onclick="deletePost('${postId}')" class="btn btn-danger">Xóa</button>
                        </td>
                    `;
                });
            });
        });
    }

    window.deletePost = function(postId) {
        if (confirm('Bạn có chắc muốn xóa bài đăng này?')) {
            db.ref('posts/' + postId).remove()
                .then(() => alert('Xóa bài đăng thành công!'))
                .catch(e => alert('Lỗi: ' + e.message));
        }
    }

    // Functions for Solution Management
    function loadSolutions() {
        const solutionsBody = document.querySelector('#solutions-table tbody');
        db.ref('solutions').on('value', snapshot => {
            solutionsBody.innerHTML = '';
            if (!snapshot.exists()) {
                return;
            }
            snapshot.forEach(postSolutionsSnapshot => {
                const postId = postSolutionsSnapshot.key;
                const solutions = postSolutionsSnapshot.val();

                if (typeof solutions !== 'object' || solutions === null) {
                    return; 
                }

                Object.keys(solutions).forEach(solutionId => {
                    const solution = solutions[solutionId];

                    if (typeof solution !== 'object' || solution === null || !solution.authorId) {
                        return; 
                    }

                    const postRef = db.ref('posts/' + postId);
                    const userRef = db.ref('users/' + solution.authorId);

                    Promise.all([postRef.once('value'), userRef.once('value')]).then(([postSnapshot, userSnapshot]) => {
                        const post = postSnapshot.val();
                        const user = userSnapshot.val();

                        const postTitle = post ? (post.description || '').substring(0, 30) + '...' : 'Bài đăng đã bị xóa';
                        const authorName = user ? (user.displayName || 'N/A') : 'N/A';
                        const solutionContent = solution.text ? solution.text : (solution.imageUrl ? '[Chỉ có hình ảnh]' : '');
                        
                        const row = solutionsBody.insertRow();
                        row.innerHTML = `
                            <td data-label="Bài đăng gốc">${postTitle}</td>
                            <td data-label="Người giải">${authorName}</td>
                            <td data-label="Nội dung">${solutionContent}</td>
                            <td data-label="Ảnh">${solution.imageUrl ? `<img src="${solution.imageUrl}" alt="Solution Image" width="100">` : ''}</td>
                            <td data-label="Ngày giải">${solution.createdAt ? new Date(solution.createdAt).toLocaleString() : 'Invalid Date'}</td>
                            <td data-label="Hành động">
                                <button onclick="openSolutionEditor('${postId}', '${solutionId}')" class="btn btn-primary">Sửa</button>
                                <button onclick="deleteSolution('${postId}', '${solutionId}')" class="btn btn-danger">Xóa</button>
                            </td>
                        `;
                    }).catch(error => {
                        console.error("Error fetching post or user data:", error);
                    });
                });
            });
        });
    }

    window.deleteSolution = function(postId, solutionId) {
        if (confirm('Bạn có chắc muốn xóa lời giải này?')) {
            db.ref(`solutions/${postId}/${solutionId}`).remove()
                .then(() => alert('Xóa lời giải thành công!'))
                .catch(e => alert('Lỗi: ' + e.message));
        }
    }

    // Functions for Quiz Management
    function loadQuizzes() {
        const quizzesTableBody = document.querySelector('#quizzes-table tbody');
        db.ref('quizzes').on('value', snapshot => {
            quizzesTableBody.innerHTML = '';
            snapshot.forEach(childSnapshot => {
                const quizId = childSnapshot.key;
                const quiz = childSnapshot.val();
                db.ref('users/' + quiz.authorId).once('value').then(userSnapshot => {
                    const user = userSnapshot.val();
                    const row = quizzesTableBody.insertRow();
                    row.innerHTML = `
                        <td>${quiz.question}</td>
                        <td>${user ? user.displayName : 'Người dùng không xác định'}</td>
                        <td>${new Date(quiz.createdAt).toLocaleString()}</td>
                        <td><button onclick="deleteQuiz('${quizId}')" class="btn btn-danger">Xóa</button></td>
                    `;
                });
            });
        });
    }

    window.deleteQuiz = function(quizId) {
        if (confirm('Bạn có chắc muốn xóa câu đố này?')) {
            db.ref('quizzes/' + quizId).remove()
                .then(() => alert('Xóa câu đố thành công!'))
                .catch(e => alert('Lỗi: ' + e.message));
        }
    }

    // Functions for Sub-Admin Management
    function loadSubAdmins() {
        const subAdminsRef = db.ref('subAdmins');
        subAdminsRef.on('value', (snapshot) => {
            const subAdminList = document.querySelector('#sub-admins-table tbody');
            subAdminList.innerHTML = '';
            snapshot.forEach(childSnapshot => {
                const subAdmin = childSnapshot.val();
                const row = `
                    <tr>
                        <td data-label="Email">${subAdmin.email}</td>
                        <td data-label="Hành động">
                            <button onclick="deleteSubAdmin('${childSnapshot.key}')" class="btn btn-danger">Xóa</button>
                        </td>
                    </tr>
                `;
                subAdminList.innerHTML += row;
            });
        });
    }



    // Event Delegation for delete/edit buttons
    function addSubAdmin() {
        const emailInput = document.getElementById('sub-admin-email');
        const email = emailInput.value.trim();
        if (email) {
            db.ref('subAdmins').push({ email: email }).then(() => {
                emailInput.value = '';
                alert('Thêm sub-admin thành công!');
                // The main .on('value') listener at the top will handle UI and permission updates.
            });
        }
    }

    window.deleteSubAdmin = function(subAdminId) {
        if (confirm('Bạn có chắc muốn xóa sub-admin này?')) {
            db.ref('subAdmins/' + subAdminId).remove()
                .then(() => {
                    alert('Đã xóa sub-admin thành công!');
                    // The main .on('value') listener at the top will handle UI and permission updates.
                });
        }
    }
});