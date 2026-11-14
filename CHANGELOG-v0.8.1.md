# Đèn Tinh 0.8.1 — Quân Lê và binh đoàn bóng tối

- Quân Lê thay Kiệt, giữ alias `kiet` để đọc bản lưu cũ. Atlas bốn hướng, bảng 24 màu, khuyên tai trái và áo Hắc Công Tử. Đánh thường phóng nguyệt nhận.
- Q tạo giáp ngay: 6,5 giây, khiên tối đa 130, giảm sát thương 35%, tốc độ +25%, xúc tu hút máu và phản kích. E lấy linh hồn gần nhất từ xác quái/cây đổ hoặc chọn trong 22 loài; tối đa 6, dùng tiếp hồi phục/cường hóa con cũ. R gọi 14 loài khác nhau trong 24 giây, tự tìm địch, né báo đòn và giữ vòng quanh người chơi khi rảnh. Linh hồn tồn tại 20 giây; đội bóng và giáp được lưu.
- Thiên Vũ có bảy sprite vũ khí cầm riêng cho bản chính và phân thân. Lôi/Thổ/Băng/Mộc dùng chuỗi ba đòn cận chiến, không bắn đạn súng. Quang Q dịch chuyển tức thì sau lưng mục tiêu trong 520 px, chí mạng và choáng; không có địch thì dịch tối đa 280 px. Mắt Quang sáng trắng/vàng.
- Golem tự chọn Đấm/Đập/Giậm/Quăng, phá cây đá và tạo hố. Quăng tóm được tinh anh, nâng 0,25 giây rồi ném theo parabol vào cụm địch/boss; ở xa dùng đá.
- Bảy NPC có kiểu tóc, mặt, trang phục và đạo cụ riêng; năm NPC truyện xuất hiện tại các trạm. Mộc Yêu có sọ hươu/sừng cây, Dạ Xoa có sừng/nanh/liềm bóng tối.
- Sửa bộ vẽ chính bỏ qua đội bóng; hiệu ứng cổng/nhện/rễ nằm dưới thân. Thêm kiểm thử đếm đủ 14 thân ngay trong cảnh game, kiểm tra tọa độ texel nguyên, alpha nhị phân, giảm chuyển động và cảm ứng.

## Kiểm tra và giới hạn

- `npm test` đạt, gồm 14/14 tình huống Quân Lê/Thiên Vũ mới. Các bộ HTTP, world pixel, chuyển động trình duyệt, Quân Lê và Thiên Vũ đạt. Build Web đóng gói 69 tệp theo allowlist.
- C# đạt 17 bài cơ bản, 4 chiến dịch, 43 nguyên tố, 18 phá hủy, 58 remaster. Tám tệp Core/Runtime/Editor biên dịch với assembly Unity 6000.3.27f1, không lỗi/cảnh báo.
- **Unity Windows đã build và chạy:** Editor nhận Unity Personal, xuất Windows x64 với 0 lỗi. Kiểm tra bản chạy thật: Q/E/R Quân Lê, 14 bóng thú tự chiến đấu, menu nguyên tố, golem và Quang Q. Script build xử lý môi trường thiếu `ALLUSERSPROFILE`. Gói Windows có trong Assets của release 0.8.1. WebGL/Editor Play Mode chưa kiểm tra; touch/FPS trình duyệt dùng giả lập desktop, chưa đo điện thoại thật.
- Đã xem mesh bằng màu ngẫu nhiên và wireframe từ bốn góc. Sửa normals, mặt suy biến, mặt trùng và lỗi góc nhọn trong ảnh wire review. Audit chia lô kiểm tra từng frame, coi kiểm tra bị bỏ qua là lỗi. Giữ seam đỉnh độc lập, mặt khuất bên trong và chi tiết sáng tách rời vì runtime dùng PNG bake 2D; số tam giác từng object và từng cảnh báo được lưu trong các `bake-report.json`. Xem [báo cáo nghiệm thu hình](qa/v081-art-acceptance.json).

## Ảnh nghiệm thu

- [Quân Lê, Hắc Giáp và 22 bóng thú](design/blender/quanle/quanle-22shadows-preview.png).
- [Bảy vũ khí, mắt Quang và bốn đòn golem](design/blender/thienvu/thienvu-weapons-golem-preview.png).
- [Bảy NPC và năm quái](design/blender/actors/npcs-vs-monsters-preview.png).
- [Binh đoàn trong cảnh Web thật](qa/v081-legion.png).
- [Binh đoàn trong bản Unity Windows](qa/v081-unity-legion.png).
- [Thiên Vũ Hệ Quang trong Unity Windows](qa/v081-unity-light.png).
