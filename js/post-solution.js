document.addEventListener("DOMContentLoaded", () => {
    const solutionForm = document.getElementById("solution-form");
    const solutionImageInput = document.getElementById("solution-image");
    const imagePreview = document.getElementById("image-preview");
    const originalPostContainer = document.getElementById("original-post-container");
    const solutionTextarea = document.getElementById("solution-text");

    // Image editor elements
    const imageEditorModal = document.getElementById('image-editor-modal');
    const imageToEdit = document.getElementById('image-to-edit');
    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    const saveImageBtn = document.getElementById('save-image-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    let cropper;
    let editedImageBlob = null;

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        alert("Không tìm thấy bài tập.");
        window.location.href = 'index.html';
        return;
    }

    let imageUrl = null;
    let postAuthorId = null;

    const postRef = db.ref('posts/' + postId);
    postRef.get().then((snapshot) => {
        if (snapshot.exists()) {
            const post = snapshot.val();
            postAuthorId = post.authorId;
            document.title = `Lời giải cho: ${post.description.substring(0, 30)}... - dikey.vn`;

            let imageHtml = post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="img-fluid rounded my-3">` : '';
            originalPostContainer.innerHTML = `
                <h4>Bài toán gốc</h4>
                <p>${post.description.replace(/\n/g, '<br>')}</p>
                ${imageHtml}
            `;

            auth.onAuthStateChanged(user => {
                if (user) {
                    if (user.uid === postAuthorId) {
                        alert("Bạn không thể tự giải bài tập của mình.");
                        window.location.href = `detail.html?id=${postId}`;
                        return;
                    }

                    const solutionsRef = db.ref('solutions/' + postId);
                    solutionsRef.orderByChild('authorId').equalTo(user.uid).get().then((solutionsSnapshot) => {
                        if (solutionsSnapshot.exists()) {
                            alert("Bạn đã gửi lời giải cho bài tập này rồi.");
                            window.location.href = `detail.html?id=${postId}`;
                        }
                    });
                } else {
                    alert("Bạn cần đăng nhập để gửi lời giải!");
                    window.location.href = 'login.html';
                }
            });

        } else {
            alert("Bài tập không tồn tại hoặc đã bị xóa.");
            window.location.href = 'index.html';
        }
    });

    document.querySelectorAll('.math-symbols .symbol').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const symbol = e.target.textContent;
            solutionTextarea.value += symbol;
            solutionTextarea.focus();
        });
    });

    // Image editing logic
    solutionImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imageToEdit.src = event.target.result;
                imageEditorModal.style.display = 'flex';
                if (cropper) {
                    cropper.destroy();
                }
                cropper = new Cropper(imageToEdit, {
                    aspectRatio: NaN, // Free crop
                    viewMode: 1,
                });
            };
            reader.readAsDataURL(file);
        }
    });

    rotateLeftBtn.addEventListener('click', () => cropper.rotate(-90));
    rotateRightBtn.addEventListener('click', () => cropper.rotate(90));
    cancelEditBtn.addEventListener('click', () => {
        imageEditorModal.style.display = 'none';
        solutionImageInput.value = ''; // Reset file input
        editedImageBlob = null;
        imagePreview.innerHTML = '';
    });

    saveImageBtn.addEventListener('click', () => {
        const canvas = cropper.getCroppedCanvas();
        canvas.toBlob(blob => {
            editedImageBlob = blob;
            imageEditorModal.style.display = 'none';

            // Display preview
            const previewUrl = URL.createObjectURL(blob);
            const img = document.createElement('img');
            img.src = previewUrl;
            img.style.maxWidth = '200px';
            imagePreview.innerHTML = '';
            imagePreview.appendChild(img);
        }, 'image/jpeg');
    });

    solutionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            alert("Bạn cần đăng nhập để gửi lời giải!");
            return;
        }

        const solutionText = solutionTextarea.value;
        if (solutionText.trim() === "" && !editedImageBlob) {
            alert("Vui lòng nhập lời giải hoặc tải lên hình ảnh.");
            return;
        }

        if (editedImageBlob) {
            const formData = new FormData();
            formData.append('file', editedImageBlob);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset);

            try {
                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                imageUrl = data.secure_url;
            } catch (error) {
                console.error('Lỗi tải ảnh lên:', error);
                alert('Có lỗi xảy ra khi tải ảnh lên.');
                return;
            }
        }

        const solutionsRef = db.ref('solutions/' + postId);
        const newSolutionRef = solutionsRef.push();
        
        newSolutionRef.set({
            text: solutionText,
            imageUrl: imageUrl,
            authorId: user.uid,
            authorEmail: user.email,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            db.ref(`posts/${postId}/replyCount`).transaction((currentCount) => (currentCount || 0) + 1);
            db.ref(`users/${user.uid}/score`).transaction((currentScore) => (currentScore || 0) + 5);
            window.location.href = `detail.html?id=${postId}`;
        }).catch(error => {
            console.error("Lỗi khi gửi lời giải: ", error);
            alert("Có lỗi xảy ra, vui lòng thử lại.");
        });
    });
});