# Tài nguyên hình ảnh Đèn Tinh

- `key-art.png`: hình minh họa màn đầu, tạo riêng bằng Image Generation cho bốn nhân vật Đèn Tinh.
- `heroes.png`: atlas RGBA 4 cột × 4 hàng; mỗi hàng là An, Linh, Kiệt, HoaVi; bốn khung chuyển động trong một hàng. Giữ alpha gốc.
- Bản sao Unity: `Unity/Assets/Resources/Art/KeyArt.png`, `Heroes.png`.

Atlas cắt lúc render/Sprite.Create theo kích thước ảnh thực. Nhân vật lật theo hướng ngắm; vũ khí tách khỏi sprite để xoay và giật theo đòn đánh.

- `environment-v03.png`, `actors-v03.png`: môi trường, quái, NPC và Đốm; xem [ART-v0.3.md](../ART-v0.3.md).
- `thien-vu-v04.png`: atlas RGBA 1254 × 1254, 4 × 4 ô; hai tư thế cho mỗi dạng Lôi/Phong/Thổ/Hỏa/Băng/Mộc/Quang và dạng cơ sở. Bản web dùng khung này kết hợp hoạt ảnh theo chuyển động. Xem [ART-v0.4.md](../ART-v0.4.md) để đọc prompt và thứ tự cắt ô.

Sprite mới được tạo bằng Image Generation tích hợp; ánh sáng, vệt đạn, kỹ năng nguyên tố và phần địa hình còn lại được dựng bằng mã Canvas. Hai atlas 0.3 và atlas Thiên Vũ chưa được chuyển sang dự án Unity.
