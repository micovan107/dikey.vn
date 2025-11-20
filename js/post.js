document.addEventListener("DOMContentLoaded", () => {
    const postForm = document.getElementById("post-form");
    const imageInput = document.getElementById("image-input");
    const imageEditorModal = document.getElementById("image-editor-modal");
    const imageToEdit = document.getElementById("image-to-edit");
    const saveImageBtn = document.getElementById("save-image-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const rotateLeftBtn = document.getElementById("rotate-left-btn");
    const rotateRightBtn = document.getElementById("rotate-right-btn");
    const imagePreviewContainer = document.getElementById("image-preview-container");

    let cropper;
    let editedImageBlob = null;

    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
        }
    });

    imageInput.addEventListener('change', (e) => {
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
        imageInput.value = ''; // Reset file input
        imagePreviewContainer.innerHTML = '';
        editedImageBlob = null;
    });

    saveImageBtn.addEventListener('click', () => {
        const canvas = cropper.getCroppedCanvas();
        canvas.toBlob(blob => {
            editedImageBlob = blob;
            const previewUrl = URL.createObjectURL(blob);
            imagePreviewContainer.innerHTML = `<img src="${previewUrl}" style="max-width: 200px; margin-top: 10px;">`;
            imageEditorModal.style.display = 'none';
        });
    });

    if (postForm) {
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

        postForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                alert("Bạn phải đăng nhập để đăng bài!");
                return;
            }

            const description = document.getElementById("description").value;
            const categorySelect = document.getElementById("category-select");
            const category = categorySelect.options[categorySelect.selectedIndex].text;
            const grade = document.getElementById("grade-select").value;

            if (!category || !grade) {
                alert("Vui lòng chọn đầy đủ loại môn và trình độ.");
                return;
            }

            const isCurrentUserAdmin = adminEmails.includes(user.email);

            let imageUrl = "";

            if (editedImageBlob) {
                try {
                    imageUrl = await uploadToCloudinary(editedImageBlob);
                } catch (error) {
                    console.error("Lỗi tải ảnh lên Cloudinary:", error);
                    alert("Đã có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại.");
                    return;
                }
            }

            const newPostRef = db.ref('posts').push();
            newPostRef.set({
                description: isCurrentUserAdmin ? description : escapeHTML(description),
                imageUrl: imageUrl,
                category: category,
                grade: grade,
                authorId: user.uid,
                authorEmail: user.email,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            })
            .then(() => {
                console.log("Bài đăng đã được tạo với ID: ", newPostRef.key);

                window.location.href = "index.html";
            })
            .catch((error) => {
                console.error("Lỗi khi tạo bài đăng: ", error);
                alert("Đã có lỗi xảy ra khi đăng bài. Vui lòng thử lại.");
            });
        });
    }
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
const adminEmails = ['micovan108@gmail.com', 'micovan105@gmail.com'];