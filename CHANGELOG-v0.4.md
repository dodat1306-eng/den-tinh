# Đèn Tinh 0.4 — Thiên Vũ, Thất Linh Sứ

Ngày 02/11/2026. Bản cập nhật cho game trình duyệt.

## Nhân vật và chiến đấu

- Nhân vật thứ năm **Thiên Vũ** với bảy dạng Lôi, Phong, Thổ, Hỏa, Băng, Mộc, Quang; mở đủ ngay khi chọn nhân vật.
- 21 kỹ năng Q/E/R khác nhau, đạn nguyên tố và nội tại riêng. Đóng băng, độc, thiêu đốt, phản đạn, giáp, khiên, hút quái và hồi phục có tác dụng thực trong mô phỏng.
- Phân thân tổng 3/5/7 bản thể: một nhân vật do người chơi điều khiển cùng 2/4/6 đồng minh AI mang nguyên tố khác. Đồng minh có máu riêng, di chuyển tránh vật cản, bắn và dùng kỹ năng, có thể bị hạ.
- Khi dùng R trong lúc phân thân, các đồng minh còn sống phối hợp tuyệt kỹ nguyên tố và vụ nổ hội tụ. Sát thương tuyệt kỹ/đồng minh không tự nạp lực R.
- Vũ khí thứ 13 **Thất Linh Ấn**, băng 21 phát, nạp 1,25 giây; đổi đặc tính đạn theo dạng nguyên tố.
- Đổi dạng không bỏ qua hồi chiêu Q/E và không hồi máu/linh lực/lực R. Thu hồi phân thân giữ hồi chiêu. Hồi sinh và dịch chuyển dọn đồng minh cùng đòn chờ.

## Hình ảnh và điều khiển

- Atlas PNG RGBA 16 ô: bảy cặp tư thế nguyên tố và một cặp tạo hình cơ sở. Ngoại hình phân biệt bằng áo, giáp, khăn, tinh thể, lá/cành và ánh sáng.
- Hoạt ảnh kết hợp đổi khung tư thế, nhịp chân theo chuyển động, nghiêng thân, ảnh dư lướt và vòng nguyên tố.
- Sét phân nhánh, phong liêm, lốc xoáy, địa trụ, hỏa long, băng tinh, dây leo và pháo thái dương; hiệu ứng biến hình/phân thân/hợp thể/hợp kích. Âm thanh đổi theo nguyên tố.
- C mở bảng chọn có hình, kỹ năng và mô tả; 1–7 đổi nhanh; G chọn tổng dạng; X phân thân/hợp thể. Bảng chọn hỗ trợ Tab và Esc.
- Nút cảm ứng DẠNG / số DẠNG / TÁCH-HỢP, thanh linh lực và số bản thể; bố cục ngang/dọc được kiểm tra bằng mô phỏng cảm ứng.
- Giảm rung/chớp theo Cài đặt; thu gọn hiệu ứng hỗ trợ và vẽ lại nhân vật chính trong hợp kích để giữ hình dễ đọc.

## Lưu, tương thích và xuất bản

- Lưu dạng hiện tại, lựa chọn 3/5/7, thời gian phân thân/hồi còn lại, máu và vị trí đồng minh. Đọc được bản lưu nhân vật cũ và giữ tiến độ các trạm.
- Máy chủ cục bộ chấp nhận bản lưu Thiên Vũ; bản web công khai tiếp tục lưu riêng trong localStorage.
- Gói Workers chỉ có 23 tệp game và `_headers`; runtime, bản lưu chủ máy, cấu hình, công cụ và Unity không được đưa vào tài nguyên công khai.
- Giữ bản đồ chín vùng, tuyến truyện, HoaVi và vũ khí/di vật cũ. Đợt này không chuyển nội dung 0.4 sang Unity và không xuất Unity Player.

Xem [README](README.md), [kiểm tra](VALIDATION-v0.4.md) và [nguồn đồ họa / prompt](ART-v0.4.md).
