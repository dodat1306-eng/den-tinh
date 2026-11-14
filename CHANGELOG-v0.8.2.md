# Đèn Tinh 0.8.2

- R của năm nhân vật dùng hồi chiêu 18–20 giây, sẵn sàng từ đầu trận. HUD hiển thị giây và lớp phủ hồi chiêu; bậc kỹ năng và cổ vật giảm thời gian chờ.
- Intro riêng dài 4,5 giây: trận đồ bảy nguyên tố của Thiên Vũ, Dạ Vực của Quân Lê, terminal/vệ tinh HoaVi, Thiên Đăng của An và đại cung rừng trúc của Linh. Sát thương, phân thân và binh đoàn chỉ xuất hiện khi intro kết thúc.
- Trong intro: miễn sát thương/khống chế, di chuyển 35%; địch trong 520 px di chuyển/ra đòn 25%, bị đẩy 12 px mỗi 0,8 giây. Bản lưu giữ thời gian, mục tiêu và hồi chiêu, không phát chiêu hai lần.
- Quân Lê quay đúng trái/phải, đứng cùng tỷ lệ 42–44 texel với các nhân vật người. Đầu/cằm gọn, tóc ôm mặt cho Quân Lê, An, Linh và NPC.
- Hắc Giáp dùng chung tỷ lệ và điểm neo chân với thân, có lớp sau/trước, sáu frame ở bốn hướng. Bỏ vòng khiên chung khi giáp hoạt động.
- 22 bóng thú, golem và Mộc Tinh có bốn trạng thái trỗi dậy/đứng/di chuyển/đánh, khớp chân, cánh, hàm và đuôi chuyển động riêng. Bóng thú lấy đà trước khi gây sát thương.
- Đồng bộ Web/Unity, thêm atlas HoaVi gốc cho Unity; sửa nút R cảm ứng và máy chủ phục vụ intro/đọc bản lưu Quân Lê.

Kiểm chứng tỷ lệ và Q: [ảnh](design/blender/quanle/scale-and-q-verification.png), [số đo](design/blender/quanle/scale-and-q-verification.json). Kết quả nghiệm thu: [acceptance.json](qa/v082/acceptance.json). Cảm ứng được kiểm tra bằng trình duyệt giả lập; chưa kiểm tra điện thoại thật. Chiến dịch sáu chương tiếp nối vẫn chỉ có ở Web.
