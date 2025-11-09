document.addEventListener("DOMContentLoaded", () => {
    const postForm = document.getElementById("post-form");

    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
        }
    });

    if (postForm) {
        postForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                alert("Bạn phải đăng nhập để đăng bài!");
                return;
            }

            const description = document.getElementById("description").value;
            const category = document.getElementById("category-select").value;
            const grade = document.getElementById("grade-select").value;
            const imageFile = document.getElementById("image-input").files[0];

            if (!category || !grade) {
                alert("Vui lòng chọn đầy đủ loại môn và trình độ.");
                return;
            }

            let imageUrl = "";

            if (imageFile) {
                try {
                    imageUrl = await uploadToCloudinary(imageFile);
                } catch (error) {
                    console.error("Lỗi tải ảnh lên Cloudinary:", error);
                    alert("Đã có lỗi xảy ra khi tải ảnh lên. Vui lòng thử lại.");
                    return;
                }
            }

            const newPostRef = db.ref('posts').push();
            newPostRef.set({
                description: description,
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