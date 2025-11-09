# Dự án Web Học Tập

Đây là một trang web học tập đơn giản được xây dựng bằng HTML, CSS và JavaScript thuần, sử dụng Firebase cho backend (Authentication, Firestore) và Cloudinary để lưu trữ hình ảnh.

## Cấu trúc thư mục

- `index.html`: Trang chủ, hiển thị danh sách các bài tập.
- `login.html`: Trang đăng nhập.
- `post.html`: Trang đăng bài tập mới.
- `detail.html`: Trang xem chi tiết một bài tập và các lời giải.
- `css/style.css`: Tệp CSS chính cho toàn bộ trang web.
- `js/`: Thư mục chứa các tệp JavaScript.
  - `firebase-config.js`: **QUAN TRỌNG!** Chứa thông tin cấu hình Firebase và Cloudinary.
  - `auth.js`: Xử lý đăng nhập, đăng xuất và trạng thái người dùng.
  - `main.js`: Logic cho trang `index.html`.
  - `post.js`: Logic cho trang `post.html`.
  - `detail.js`: Logic cho trang `detail.html`.

## Hướng dẫn cài đặt

### 1. Cài đặt Firebase

1.  Truy cập [Firebase Console](https://console.firebase.google.com/).
2.  Tạo một dự án mới.
3.  Trong dự án của bạn, đi đến **Project Settings** (biểu tượng bánh răng) > **General**.
4.  Trong phần "Your apps", nhấp vào biểu tượng web (`</>`) để tạo một ứng dụng web mới.
5.  Đặt tên cho ứng dụng và nhấp vào "Register app".
6.  Firebase sẽ cung cấp cho bạn một đối tượng `firebaseConfig`. Hãy sao chép nó.
7.  Mở tệp `js/firebase-config.js` và dán đối tượng `firebaseConfig` bạn vừa sao chép vào đúng vị trí.
8.  Kích hoạt các dịch vụ cần thiết:
    *   **Authentication**: Vào tab "Authentication", chọn "Sign-in method" và kích hoạt "Email/Password".
    *   **Firestore Database**: Vào tab "Firestore Database", tạo một cơ sở dữ liệu mới ở chế độ production. Bạn sẽ cần chỉnh sửa **Rules** để cho phép đọc/ghi (xem bên dưới).

### 2. Cấu hình Rules cho Firestore

Để đơn giản cho việc phát triển, bạn có thể sử dụng các rules sau. **Lưu ý: Các rules này không an toàn cho môi trường production thực tế.**

Vào **Firestore Database > Rules** và dán nội dung sau:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cho phép bất kỳ ai đã đăng nhập được đọc, ghi, tạo bài đăng
    match /posts/{postId} {
      allow read, create, update, delete: if request.auth != null;
      
      // Cho phép bất kỳ ai đã đăng nhập được đọc và tạo lời giải
      match /solutions/{solutionId} {
      	allow read, create: if request.auth != null;
      }
    }
  }
}
```

### 3. Cài đặt Cloudinary

1.  Truy cập [Cloudinary](https://cloudinary.com/) và tạo một tài khoản.
2.  Trên Dashboard, bạn sẽ thấy `Cloud Name`.
3.  Đi đến **Settings** (biểu tượng bánh răng) > **Upload**.
4.  Cuộn xuống phần "Upload presets". Nhấp vào "Add upload preset".
5.  Đặt tên cho preset (ví dụ: `web_hoc_tap_preset`).
6.  Thay đổi "Signing Mode" thành **Unsigned**.
7.  Lưu lại preset.
8.  Mở tệp `js/firebase-config.js` và điền `cloudName` và tên `uploadPreset` của bạn vào đối tượng `cloudinaryConfig`.

## Chạy dự án

Không cần server! Chỉ cần mở tệp `index.html` trong trình duyệt của bạn.