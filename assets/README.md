# Tài nguyên hình ảnh 0.2

- `key-art.png`: hình minh họa màn đầu, tạo riêng bằng Image Generation cho bốn nhân vật Đèn Tinh.
- `heroes.png`: atlas RGBA 4 cột × 4 hàng; mỗi hàng là An, Linh, Kiệt, HoaVi; bốn khung chuyển động trong một hàng. Giữ alpha gốc.
- Bản sao Unity: `Unity/Assets/Resources/Art/KeyArt.png`, `Heroes.png`.

Atlas cắt lúc render/Sprite.Create theo kích thước ảnh thực. Nhân vật lật theo hướng ngắm; vũ khí tách khỏi sprite để xoay và giật theo đòn đánh. Cảnh vật, ánh sáng và hiệu ứng còn lại vẽ bằng mã nguồn của từng runtime.
