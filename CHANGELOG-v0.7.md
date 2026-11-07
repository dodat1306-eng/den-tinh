# Đèn Tinh 0.7 — chuyển động và hiệu ứng

Theo lựa chọn của chủ game, giữ hướng 2.5D của concept đầu tiên và nhận diện đủ An, Linh, Kiệt, HoaVi, Thiên Vũ. Phương án Mộc sắc được cất trong kho bản nháp tại máy.

- Chuyển động trên sprite vẽ hiện có dùng lưới biến dạng ở thời điểm render: trọng tâm, chân, phần thân, vạt áo/tóc, lấy đà, ra đòn, thu thế và lướt. Nhịp đi và biên độ khác theo nhân vật; Thiên Vũ có cấu hình riêng cho bảy dạng. Vũ khí, bóng dưới chân và hình gốc được giữ.
- Phân thân có tư thế tung chiêu tương ứng với lần tấn công thật của AI. Các động tác này là trạng thái hình ảnh tạm, không ghi vào save. Hồi sinh, dịch chuyển và tua lại thời gian dọn trạng thái cũ.
- Bộ hiệu ứng Blender gồm bảy hàng × tám khung hình nền trong suốt, chứa lửa, gió, đá, lôi, băng, lá và quang. Nguồn dựng và các chuyển động có thể chỉnh trong `design/blender/spirit-fx-v07.blend`, tạo lại bằng script `.py` đi kèm.
- An có phượng lửa với cánh/đuôi chuyển động; Linh có âm vang theo đường tên và mũi tên giáng xuống; Kiệt có tia lôi bám thương/cọc trận; HoaVi có các dòng mã và con trỏ; bảy nguyên tố có hình học và mảnh hiệu ứng riêng.
- Làm lại lớp impact, tia Quang và hợp kích để giảm các khối sáng che nhân vật. Dấu báo đòn của boss và vùng gây sát thương tiếp tục dùng cơ chế hiện có.
- Hiệu ứng bổ sung giới hạn 36 phần tử; impact được giãn theo từng địch để giảm chồng hình. Mức đồ họa tự động/thấp giảm số mảnh và độ chia lưới; Giảm chuyển động dùng sprite nguyên, giảm vệt lướt và hiệu ứng chuyển dạng.

Đây là nâng cấp trên bản trình duyệt. Nhân vật đang dùng chuyển động biến dạng trên hình vẽ; chưa thay thành bộ mô hình 3D gắn xương hoàn chỉnh. Blender được dùng thực tế để dựng/bake bộ hiệu ứng. Bản Unity cũ giữ riêng.

Bản lưu 0.6 cùng nâng cấp làng, cửa hàng và kỹ năng vẫn đọc được; định dạng gameplay không đổi. Bộ web có 39 tài nguyên game và `_headers`; save, runtime, hồ sơ trình duyệt và tài liệu thiết kế không nằm trong gói công khai.
