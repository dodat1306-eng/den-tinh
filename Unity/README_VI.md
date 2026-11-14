# Đèn Tinh 0.8 — dự án Unity 2D

Runtime C# dùng camera trực giao và SpriteRenderer, không nhúng Web. Lõi mô phỏng nằm trong `Assets/Scripts/Core`; dữ liệu nhân vật và di vật xuất từ catalog chung bằng `tools/export-unity-content.cjs`.

## Nội dung 0.8

- Năm nhân vật, pháp khí riêng và cây kỹ năng. Thiên Vũ có bảy dạng, phân thân 3/5/7 và triệu hồi golem/treant; không có co-op.
- Atlas môi trường/actors giống hệt bản Web: terrain ghép tile, cây/đá/kiến trúc, quái hoạt ảnh, NPC và cáo. Texture dùng Point filtering, alpha nhị phân, anchor riêng; camera căn lưới để mỗi texel hiện 2 × 2 pixel.
- Vật thể có bốn cấp phá hủy, cháy lan, đóng băng/vỡ băng, chém đổ, tro tung bụi và vết tích mặt đất. Bản lưu giữ trạng thái và timer; đọc được bản lưu cũ.
- Bộ hình bảy boss có trong atlas chung; chiến dịch sáu chương tiếp nối hiện chỉ có ở Web.

## Trạng thái kiểm tra

- Lõi C#: 17 bài cơ bản, 4 tình huống chiến dịch, 43 kiểm tra nguyên tố và 18 tình huống phá hủy đều đạt.
- Toàn bộ bảy file Runtime/Core/Editor được biên dịch bằng Roslyn với assembly thật của Unity **6000.3.27f1**: không có lỗi. Có một cảnh báo trường `scroll` cũ không dùng.
- Editor đã khởi chạy ở batch mode nhưng build dừng với mã **198**: `No valid Unity Editor license found. Please activate your license.` Chưa có bản Windows/WebGL hay kiểm tra Play Mode; cần người sở hữu đăng nhập và kích hoạt giấy phép trong Hub.
- Kết quả Chrome và cảm ứng giả lập chỉ xác nhận bản Web, không xác nhận giao diện/cảm ứng Unity.

## Mở và build

1. Dùng Unity **6.3 LTS 6000.3.27f1**. Editor được cài tại `E:\Tools\Unity\6000.3.27f1`. Kích hoạt giấy phép hợp lệ qua Unity Hub trước khi chạy Editor.
2. Thêm thư mục `E:\Games\DenTinh\Unity` vào Hub rồi mở. Menu **Đèn Tinh → Chuẩn bị scene và cấu hình** tạo scene nếu chưa có; bấm Play.
3. Chọn **Đèn Tinh → Build Windows 64-bit** hoặc chạy `BUILD_UNITY.bat`. Kết quả tại `Unity/Builds/Windows/DenTinh.exe`. Windows dùng Mono, không cần Visual Studio/IL2CPP. WebGL cần cài thêm Web Build Support đúng phiên bản.

Kiểm tra lõi độc lập Editor:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/Test-Unity-Core.ps1
```

## Lưu và tài nguyên

Unity lưu tại `Saves` cạnh bản chạy, hoặc `Unity/Saves` trong Editor, kèm `unity-save.json.bak`. Web và Unity có định dạng/tọa độ riêng, chưa tự chuyển tiến độ giữa hai nền tảng.

Nguồn mesh và bake: `design/blender/world`, `design/blender/actors`; ảnh chung tại `Unity/Assets/Resources/Art`. Đồ họa tự dựng cho dự án; Soul Knight là tham chiếu phong cách, không dùng tài nguyên của game đó.
