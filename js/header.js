
document.addEventListener("DOMContentLoaded", () => {
    const headerHTML = `
        <header>
            <div class="container">
                <h1><a href="index.html">dikey.vn</a></h1>
                <nav id="nav-links">
                    <a href="index.html">Trang Chủ</a>
                    <a href="post.html">Đăng Bài</a>
                    <a href="wall.html">Tường</a>
                    <a href="budget.html">Ngân sách</a>
                    <a href="create-quiz.html">Tạo trắc nghiệm</a>
                    <a href="quiz-list.html">Khảo sát</a>
                    <a href="shop.html">Cửa hàng</a>
                    <a href="gift-xu.html">Tặng Xu</a>
                </nav>
            </div>
        </header>
    `;
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
});