document.addEventListener("DOMContentLoaded", () => {
    const solutionForm = document.getElementById("solution-form");
    const solutionImageInput = document.getElementById("solution-image");
    const imagePreviewContainer = document.getElementById("image-preview-container");
    const originalPostContainer = document.getElementById("original-post-container");
    const solutionTextarea = document.getElementById("solution-text");
    const editImageBtn = document.getElementById('edit-image-btn');

    // Image editor elements
    const imageEditorModal = document.getElementById('image-editor-modal');
    const imageToEdit = document.getElementById('image-to-edit');
    const rotateLeftBtn = document.getElementById('rotate-left-btn');
    const rotateRightBtn = document.getElementById('rotate-right-btn');
    const saveImageBtn = document.getElementById('save-image-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    let cropper;
    let editedImageBlob = null;
    let originalImageUrl = null;

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    const solutionId = urlParams.get('solutionId');
    const isEditMode = urlParams.get('edit') === 'true';

    if (!postId) {
        alert("Không tìm thấy bài tập.");
        window.location.href = 'index.html';
        return;
    }

    const postRef = db.ref('posts/' + postId);
    postRef.get().then((snapshot) => {
        if (snapshot.exists()) {
            const post = snapshot.val();
            document.title = `Lời giải cho: ${post.description.substring(0, 30)}... - dikey.vn`;

            let imageHtml = post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="img-fluid rounded my-3">` : '';
            originalPostContainer.innerHTML = `
                <h4>Bài toán gốc</h4>
                <p>${post.description.replace(/\n/g, '<br>')}</p>
                ${imageHtml}
            `;
        } else {
            alert("Bài tập không tồn tại hoặc đã bị xóa.");
            window.location.href = 'index.html';
        }
    });

    if (isEditMode && solutionId) {
        const solutionRef = db.ref(`solutions/${postId}/${solutionId}`);
        solutionRef.get().then(snapshot => {
            if (snapshot.exists()) {
                const solution = snapshot.val();
                solutionTextarea.value = solution.text || '';
                if (solution.imageUrl) {
                    originalImageUrl = solution.imageUrl;
                    imagePreviewContainer.innerHTML = `<img src="${solution.imageUrl}" style="max-width: 200px; margin-top: 10px;">`;
                    editImageBtn.style.display = 'block';
                }
            }
        });
    }

    editImageBtn.addEventListener('click', () => {
        if (originalImageUrl) {
            imageToEdit.src = originalImageUrl;
            imageEditorModal.style.display = 'flex';
            if (cropper) {
                cropper.destroy();
            }
            cropper = new Cropper(imageToEdit, {
                aspectRatio: NaN, // Free crop
                viewMode: 1,
            });
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
    });

    saveImageBtn.addEventListener('click', () => {
        const canvas = cropper.getCroppedCanvas();
        canvas.toBlob(blob => {
            editedImageBlob = blob;
            const previewUrl = URL.createObjectURL(blob);
            imagePreviewContainer.innerHTML = `<img src="${previewUrl}" style="max-width: 200px; margin-top: 10px;">`;
            originalImageUrl = previewUrl; // Update originalImageUrl to the new blob url for re-editing
            editImageBtn.style.display = 'block';
            imageEditorModal.style.display = 'none';
        }, 'image/jpeg');
    });

    solutionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            alert("Bạn cần đăng nhập!");
            return;
        }

        const solutionText = solutionTextarea.value;
        if (solutionText.trim() === "" && !editedImageBlob && !originalImageUrl) {
            alert("Vui lòng nhập lời giải hoặc tải lên hình ảnh.");
            return;
        }

        let imageUrl = originalImageUrl;
        if (editedImageBlob) {
            try {
                imageUrl = await uploadToCloudinary(editedImageBlob);
            } catch (error) {
                console.error('Lỗi tải ảnh lên:', error);
                alert('Có lỗi xảy ra khi tải ảnh lên.');
                return;
            }
        }

        if (isEditMode && solutionId) {
            const solutionRef = db.ref(`solutions/${postId}/${solutionId}`);
            solutionRef.update({
                text: solutionText,
                imageUrl: imageUrl,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                alert('Cập nhật lời giải thành công!');
                window.location.href = `detail.html?id=${postId}`;
            }).catch(error => {
                console.error("Lỗi khi cập nhật lời giải: ", error);
                alert("Có lỗi xảy ra, vui lòng thử lại.");
            });
        } else {
            const solutionsRef = db.ref('solutions/' + postId);
            const newSolutionRef = solutionsRef.push();
            
            newSolutionRef.set({
                text: solutionText,
                imageUrl: imageUrl,
                authorId: user.uid,
                authorEmail: user.email,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                const replyCountUpdate = db.ref(`posts/${postId}/replyCount`).transaction((currentCount) => (currentCount || 0) + 1);
                const scoreUpdate = db.ref(`users/${user.uid}/score`).transaction((currentScore) => (currentScore || 0) + 5);

                return Promise.all([replyCountUpdate, scoreUpdate]);
            }).then(() => {
                window.location.href = `detail.html?id=${postId}`;

            }).catch(error => {
                console.error("Lỗi khi gửi lời giải: ", error);
                alert("Có lỗi xảy ra, vui lòng thử lại.");
            });
        }
    });
});

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset); // Make sure cloudinaryConfig is defined

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Tải ảnh lên thất bại');
    }

    const data = await response.json();
    return data.secure_url;
}