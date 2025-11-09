const subjects = [
    // Cấp 1
    { name: "Tiếng Việt 1" },
    { name: "Toán 1" },
    { name: "Tiếng Việt 2" },
    { name: "Toán 2" },
    { name: "Tiếng Việt 3" },
    { name: "Toán 3" },
    { name: "Tin học 3" },
    { name: "Tiếng Việt 4" },
    { name: "Toán 4" },
    { name: "Khoa học 4" },
    { name: "Lịch sử và Địa lý 4" },
    { name: "Tiếng Việt 5" },
    { name: "Toán 5" },
    { name: "Khoa học 5" },
    { name: "Lịch sử và Địa lý 5" },

    // Cấp 2
    { name: "Ngữ văn 6" },
    { name: "Toán 6" },
    { name: "Khoa học tự nhiên 6" },
    { name: "Lịch sử và Địa lý 6" },
    { name: "Tin học 6" },
    { name: "Công nghệ 6" },
    { name: "Tiếng Anh 6" },
    { name: "Ngữ văn 7" },
    { name: "Toán 7" },
    { name: "Khoa học tự nhiên 7" },
    { name: "Lịch sử và Địa lý 7" },
    { name: "Tin học 7" },
    { name: "Công nghệ 7" },
    { name: "Tiếng Anh 7" },
    { name: "Ngữ văn 8" },
    { name: "Toán 8" },
    { name: "Vật lí 8" },
    { name: "Hóa học 8" },
    { name: "Sinh học 8" },
    { name: "Lịch sử 8" },
    { name: "Địa lý 8" },
    { name: "Tiếng Anh 8" },
    { name: "Ngữ văn 9" },
    { name: "Toán 9" },
    { name: "Vật lí 9" },
    { name: "Hóa học 9" },
    { name: "Sinh học 9" },
    { name: "Lịch sử 9" },
    { name: "Địa lý 9" },
    { name: "Tiếng Anh 9" },

    // Cấp 3
    { name: "Ngữ văn 10" },
    { name: "Toán 10" },
    { name: "Vật lí 10" },
    { name: "Hóa học 10" },
    { name: "Sinh học 10" },
    { name: "Lịch sử 10" },
    { name: "Địa lý 10" },
    { name: "Tiếng Anh 10" },
    { name: "Công nghệ 10" },
    { name: "Tin học 10" },
    { name: "GDCD 10" },
    { name: "Ngữ văn 11" },
    { name: "Toán 11" },
    { name: "Vật lí 11" },
    { name: "Hóa học 11" },
    { name: "Sinh học 11" },
    { name: "Lịch sử 11" },
    { name: "Địa lý 11" },
    { name: "Tiếng Anh 11" },
    { name: "Công nghệ 11" },
    { name: "Tin học 11" },
    { name: "GDCD 11" },
    { name: "Ngữ văn 12" },
    { name: "Toán 12" },
    { name: "Vật lí 12" },
    { name: "Hóa học 12" },
    { name: "Sinh học 12" },
    { name: "Lịch sử 12" },
    { name: "Địa lý 12" },
    { name: "Tiếng Anh 12" },
    { name: "GDCD 12" },

    // Môn khác
    { name: "Luyện thi Đại học" },
    { name: "Âm nhạc" },
    { name: "Mỹ thuật" },
    { name: "Thể dục" }
];

window.addSubjects = function() {
    const subjectsRef = db.ref('subjects');
    // Xóa dữ liệu cũ trước khi thêm mới để tránh trùng lặp
    subjectsRef.remove().then(() => {
        console.log("Đã xóa danh sách môn học cũ.");
        subjects.forEach(subject => {
            subjectsRef.push(subject).then(() => {
                console.log(`Đã thêm môn: ${subject.name}`);
            }).catch(error => {
                console.error(`Lỗi khi thêm môn ${subject.name}: `, error);
            });
        });
    });
}

// Để cập nhật danh sách môn học, hãy mở console của trình duyệt và gõ: addSubjects()