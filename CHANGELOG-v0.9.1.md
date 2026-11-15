# Đèn Tinh 0.9.1 — Đại tu RPG và bản Unity

- Làm lại đủ 32 cổ vật: 12 món từ Boss và 20 món trên bệ, theo danh sách chi tiết của kế hoạch. Atlas 32×32 có hình riêng từng món. Boss thả vật phẩm theo quỹ đạo; chỉ nhận sau khi đáp đất và nhấn F. Bệ có đường tiếp cận, quái canh và sáu phong ấn Hỏa/Thổ/Lôi; công cụ cạnh bệ cho phép mọi nhân vật giải đố.
- Bỏ hoàn toàn popup Thiên Phú và nhánh Mastery. Cấp 1 cần 220 EXP; cấp sau cần `floor(220 * level^1.68 + level * 110)`. Mỗi cấp nhận 2 điểm chỉ số và 1 điểm kỹ năng. I có đủ 12 chỉ số, tác dụng chiến đấu và tẩy điểm tại làng giá 80 xu; K giữ nâng kỹ năng riêng.
- Tính lại chỉ số từ nhân vật, cấp, điểm đã cộng và nâng cấp để tránh nhân đôi khi lưu nhiều lần. Giữ HP, thời gian tồn tại và tỷ lệ Thống Lĩnh của phân thân, bóng thú, golem và treant. Save cũ thiếu lịch sử nâng cấp chỉ có thể suy ra từ dữ liệu còn lại.
- 25 NPC có chân dung riêng và bốn tầng hội thoại, năm tuyến truyện có bước tương tác thực tế: ký ức, giai điệu tám nốt, bảy nguyên tố và đấu bản ngã. Trả ký ức tại Cội Đa mới mở sáu chương tiếp nối; tầng sự thật cuối mở sau chương sáu.
- Hoàn thiện hiệu ứng của 32 cổ vật, phân loại sát thương đánh thường/kỹ năng/triệu hồi, xử lý khiên trước cứu tử Cuội, lưu số đòn lúc bắn và ngăn quái bị mê hoặc tiếp tục đánh.
- Unity C# có cùng catalog, chỉ số, cổ vật, NPC, nhiệm vụ cá nhân và sáu chương; có giao diện chỉ số, kỹ năng, nhật ký, bản đồ, truyền thuyết và chơi giai điệu. Build Windows 0.9.1 bằng Unity 6000.6.9f1, không nhúng Web.
- Sửa renderer đang dùng để thật sự vẽ bệ và cổ vật. Giao diện Web 390 px có chữ tối thiểu 13 px và nút cộng điểm tối thiểu 44×44 px.

Kiểm chứng và ảnh Web tại [qa/v091/acceptance.json](qa/v091/acceptance.json). Kiểm tra C# độc lập, kiểm tra JsonUtility/atlas trong Editor và chạy bản Windows thật là ba bước riêng; không dùng kết quả EditMode rỗng làm bằng chứng. Chưa kiểm tra điện thoại thật, WebGL hoặc đánh giá hình ảnh Unity bằng mắt.
