document.addEventListener("DOMContentLoaded", () => {
    const editPostForm = document.getElementById("edit-post-form");
    const imageInput = document.getElementById("image-input");
    const imageEditorModal = document.getElementById("image-editor-modal");
    const imageToEdit = document.getElementById("image-to-edit");
    const saveImageBtn = document.getElementById("save-image-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const rotateLeftBtn = document.getElementById("rotate-left-btn");
    const rotateRightBtn = document.getElementById("rotate-right-btn");
    const imagePreviewContainer = document.getElementById("image-preview-container");
    const descriptionTextarea = document.getElementById("description");
    const categorySelect = document.getElementById("category-select");
    const gradeSelect = document.getElementById("grade-select");
    const editImageBtn = document.getElementById('edit-image-btn');

    let cropper;
    let editedImageBlob = null;
    let originalImageUrl = null;

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');

    if (!postId) {
        alert("Không tìm thấy bài đăng.");
        window.location.href = 'admin.html';
        return;
    }

    const postRef = db.ref('posts/' + postId);

    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
        }
    });

    // Fetch post data and populate the form
    postRef.get().then((snapshot) => {
        if (snapshot.exists()) {
            const post = snapshot.val();
            descriptionTextarea.value = post.description;
            categorySelect.value = post.category;
            gradeSelect.value = post.grade;
            if (post.imageUrl) {
                originalImageUrl = post.imageUrl;
                imagePreviewContainer.innerHTML = `<img src="${post.imageUrl}" style="max-width: 200px; margin-top: 10px;">`;
                editImageBtn.style.display = 'block';
            }
        } else {
            alert("Bài đăng không tồn tại hoặc đã bị xóa.");
            window.location.href = 'admin.html';
        }
    });

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

    rotateLeftBtn.addEventListener('click', () => cropper.rotate(-90));
    rotateRightBtn.addEventListener('click', () => cropper.rotate(90));
    cancelEditBtn.addEventListener('click', () => {
        imageEditorModal.style.display = 'none';
        imageInput.value = ''; // Reset file input
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
        });
    });

    editPostForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            alert("Bạn phải đăng nhập để chỉnh sửa bài đăng!");
            return;
        }

        const description = descriptionTextarea.value;
        const category = categorySelect.value;
        const grade = gradeSelect.value;

        if (!category || !grade) {
            alert("Vui lòng chọn đầy đủ loại môn và trình độ.");
            return;
        }

        let imageUrl = originalImageUrl;

        if (editedImageBlob) {
            try {
                imageUrl = await uploadToCloudinary(editedImageBlob);
            } catch (error) {
                console.error("Lỗi tải ảnh lên Cloudinary:", error);
                alert("Đã có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại.");
                return;
            }
        }

        const updatedPostData = {
            description: description,
            imageUrl: imageUrl,
            category: category,
            grade: grade,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };

        postRef.update(updatedPostData)
            .then(() => {
                alert("Bài đăng đã được cập nhật thành công!");
                window.location.href = "admin.html";
            })
            .catch((error) => {
                console.error("Lỗi khi cập nhật bài đăng: ", error);
                alert("Đã có lỗi xảy ra khi cập nhật bài đăng. Vui lòng thử lại.");
            });
    });
});

// Hàm tải ảnh lên Cloudinary
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Tải ảnh lên thất bại');
    }

    const data = await response.json();
    return data.secure_url; // Trả về URL an toàn của ảnh
}