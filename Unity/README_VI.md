# Đèn Tinh 0.8.1 — dự án Unity 2D

Runtime C# dùng camera trực giao và SpriteRenderer, không nhúng Web. Lõi mô phỏng nằm trong `Assets/Scripts/Core`; dữ liệu nhân vật và di vật xuất từ catalog chung bằng `tools/export-unity-content.cjs`.

## Nội dung 0.8

- Quân Lê thay Kiệt, giữ tương thích bản lưu cũ: Q Hắc Giáp, E từ xác quái/cây, 22 bóng thú, R 14 đồng đội trong 24 giây. Thiên Vũ có bảy vũ khí riêng, bốn dạng cận chiến, Quang Q dịch chuyển sau lưng địch; golem tự dùng Đấm/Đập/Giậm/Quăng. Bảy NPC có hình và hội thoại riêng.
- Atlas môi trường/actors giống hệt bản Web: terrain ghép tile, cây/đá/kiến trúc, quái hoạt ảnh, NPC và cáo. Texture dùng Point filtering, alpha nhị phân, anchor riêng; camera căn lưới để mỗi texel hiện 2 × 2 pixel.
- Vật thể có bốn cấp phá hủy, cháy lan, đóng băng/vỡ băng, chém đổ, tro tung bụi và vết tích mặt đất. Bản lưu giữ trạng thái và timer; đọc được bản lưu cũ.
- Bộ hình bảy boss có trong atlas chung; chiến dịch sáu chương tiếp nối hiện chỉ có ở Web.

## Trạng thái kiểm tra

- Lõi C#: 17 bài cơ bản, 4 tình huống chiến dịch, 43 kiểm tra nguyên tố, 18 tình huống phá hủy và 58 kiểm tra remaster đều đạt.
- Toàn bộ tám file Runtime/Core/Editor được biên dịch bằng Roslyn với assembly thật của Unity **6000.3.27f1**: không có lỗi hay cảnh báo. SHA-256 nguồn nằm trong `qa/unity-v08-compile.json`.
- Unity Personal đã được Editor nhận. Build Windows x64 thành công, **0 lỗi**; bản chạy thật đã kiểm tra menu, Q/E/R Quân Lê với 14 bóng thú tự chiến đấu, menu nguyên tố, golem và Quang Q. Báo cáo và ảnh nằm trong `qa/unity-v08-compile.json`. WebGL và Editor Play Mode chưa kiểm tra.
- Script build tự bổ sung `ALLUSERSPROFILE` khi môi trường thiếu biến này, tránh lỗi Package Manager `The "path" argument must be of type string. Received undefined`. Đã build lại thành công với biến này bị bỏ khỏi môi trường đầu vào.
- Kết quả Chrome và cảm ứng giả lập chỉ xác nhận bản Web, không xác nhận giao diện/cảm ứng Unity.

## Mở và build

1. Dùng Unity **6.3 LTS 6000.3.27f1**. Editor được cài tại `E:\Tools\Unity\6000.3.27f1`. Kích hoạt giấy phép hợp lệ qua Unity Hub trước khi chạy Editor.
2. Thêm thư mục `E:\Games\DenTinh\Unity` vào Hub rồi mở. Menu **Đèn Tinh → Chuẩn bị scene và cấu hình** tạo scene nếu chưa có; bấm Play.
3. Chọn **Đèn Tinh → Build Windows 64-bit** hoặc chạy `BUILD_UNITY.bat`. Kết quả tại `Unity/Builds/Windows/DenTinh.exe`. Windows dùng Mono, không cần Visual Studio/IL2CPP. WebGL cần cài thêm Web Build Support đúng phiên bản.

Bản Windows 0.8.1 có tại [GitHub Releases](https://github.com/dodat1306-eng/den-tinh/releases/tag/v0.8.1). Giải nén toàn bộ rồi mở `DenTinh.exe`; giữ các thư mục và DLL đi kèm.

Kiểm tra lõi độc lập Editor:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/Test-Unity-Core.ps1
```

## Lưu và tài nguyên

Unity lưu tại `Saves` cạnh bản chạy, hoặc `Unity/Saves` trong Editor, kèm `unity-save.json.bak`. Web và Unity có định dạng/tọa độ riêng, chưa tự chuyển tiến độ giữa hai nền tảng.

Nguồn mesh và bake: `design/blender/world`, `design/blender/actors`; ảnh chung tại `Unity/Assets/Resources/Art`. Đồ họa tự dựng cho dự án; Soul Knight là tham chiếu phong cách, không dùng tài nguyên của game đó.
