document.addEventListener("DOMContentLoaded", () => {
    const editProfileForm = document.getElementById("edit-profile-form");
    const displayNameInput = document.getElementById("display-name");
    const avatarInput = document.getElementById("avatar-input");

    let currentUser = null;

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            // Tải thông tin hiện tại của người dùng
            const userRef = db.ref('users/' + user.uid);
            userRef.once('value', snapshot => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    displayNameInput.value = userData.displayName || '';
                }
            });
        } else {
            window.location.href = 'login.html';
        }
    });

    editProfileForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!currentUser) return;

        const newDisplayName = displayNameInput.value;
        const newAvatarFile = avatarInput.files[0];

        const userRef = db.ref('users/' + currentUser.uid);
        let newAvatarUrl = null;

        // 1. Tải ảnh đại diện mới lên Cloudinary (nếu có)
        if (newAvatarFile) {
            try {
                newAvatarUrl = await uploadToCloudinary(newAvatarFile);
            } catch (error) {
                console.error("Lỗi tải ảnh đại diện lên Cloudinary:", error);
                alert("Có lỗi xảy ra khi tải ảnh đại diện lên.");
                return;
            }
        }

        // 2. Cập nhật thông tin trong Realtime Database
        const updateData = {
            displayName: newDisplayName
        };

        if (newAvatarUrl) {
            updateData.photoURL = newAvatarUrl;
        }

        Promise.all([
            userRef.update(updateData),
            currentUser.updateProfile({
                displayName: newDisplayName,
                photoURL: newAvatarUrl || currentUser.photoURL
            })
        ]).then(() => {
                alert("Hồ sơ đã được cập nhật thành công!");
                window.location.href = `profile.html?uid=${currentUser.uid}`;
            })
            .catch(error => {
                console.error("Lỗi cập nhật hồ sơ:", error);
                alert("Có lỗi xảy ra khi cập nhật hồ sơ.");
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
    return data.secure_url;
}