// QUAN TRỌNG: ĐIỀN THÔNG TIN CẤU HÌNH FIREBASE CỦA BẠN VÀO ĐÂY
const firebaseConfig = {
  apiKey: "AIzaSyD7cc6BCivqXBkvyVAN7IJfWwIdzlyHvLc",
  authDomain: "luutrutailieu-8b8a9.firebaseapp.com",
  databaseURL: "https://luutrutailieu-8b8a9-default-rtdb.firebaseio.com",
  projectId: "luutrutailieu-8b8a9",
  storageBucket: "luutrutailieu-8b8a9.firebasestorage.app",
  messagingSenderId: "546483705627",
  appId: "1:546483705627:web:6657f231053dc66c86e5be",
  measurementId: "G-P9899B32DX"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// QUAN TRỌNG: ĐIỀN THÔNG TIN CLOUDINARY CỦA BẠN VÀO ĐÂY
const cloudinaryConfig = {
    cloudName: 'dw8rpacnn',
    uploadPreset: 'nguyentiennamT' // Preset không cần chữ ký (unsigned)
};