# Đèn Tinh 0.8.3 — dự án Unity 2D

Runtime C# dùng camera trực giao và SpriteRenderer, không nhúng Web. Lõi mô phỏng nằm trong `Assets/Scripts/Core`; dữ liệu nhân vật và di vật xuất từ catalog chung bằng `tools/export-unity-content.cjs`.

## Nội dung 0.8.3

- R sẵn sàng từ đầu trận, hồi sau 18–20 giây. Thiên Vũ chỉ tung R của dạng hiện tại sau 0,28 giây; X dùng trận đồ 3/5/7 kéo dài 4,2 giây, tạo tổng 3/5/7 bản thể gồm bản chính trong 18 giây. Bốn nhân vật khác giữ intro R 4,5 giây; Quân Lê gọi 14 bóng thú. Bản lưu giữ chiêu đang lấy đà.
- Quân Lê giữ tương thích bản lưu `kiet`: Q Hắc Giáp ôm vai/ngực ở bốn hướng, E từ xác quái/cây. Tỷ lệ người, tóc, hướng trái/phải đã chỉnh; triệu hồi có hoạt ảnh khớp và lấy đà trước khi gây sát thương. Thiên Vũ có bảy vũ khí, golem dùng Đấm/Đập/Giậm/Quăng. NPC có hình và hội thoại riêng.
- Atlas môi trường/actors giống hệt bản Web: terrain ghép tile, cây/đá/kiến trúc, quái hoạt ảnh, NPC và cáo. Texture dùng Point filtering, alpha nhị phân, anchor riêng; camera căn lưới để mỗi texel hiện 2 × 2 pixel.
- Vật thể có bốn cấp phá hủy, cháy lan, đóng băng/vỡ băng, chém đổ, tro tung bụi và vết tích mặt đất. Bản lưu giữ trạng thái và timer; đọc được bản lưu cũ.
- Bộ hình bảy boss có trong atlas chung; chiến dịch sáu chương tiếp nối hiện chỉ có ở Web.

## Trạng thái kiểm tra

- Lõi C#: 17 bài cơ bản, 4 tình huống chiến dịch, 44 kiểm tra nguyên tố, 18 tình huống phá hủy, 81 kiểm tra remaster và 82 kiểm tra tuyệt kỹ đều đạt.
- Unity **6000.3.27f1** biên dịch Runtime/Core/Editor không lỗi hay cảnh báo. Editor Play Mode xác nhận thời gian game chạy thật, HoaVi tự phát R sau intro, X 3/5/7, R từng hệ và số lượng phân thân/bóng thú/mắt laser khi phát chiêu.
- Unity Personal đã được Editor nhận. Build Windows x64 và kiểm tra khởi động bản 0.8.3 được ghi tại `qa/v083/acceptance.json`; Play Mode kiểm chứng bằng CLI/API, không dùng ảnh Unity. WebGL chưa kiểm tra.
- Script build tự bổ sung `ALLUSERSPROFILE` khi môi trường thiếu biến này, tránh lỗi Package Manager `The "path" argument must be of type string. Received undefined`. Đã build lại thành công với biến này bị bỏ khỏi môi trường đầu vào.
- Kết quả Chrome và cảm ứng giả lập chỉ xác nhận bản Web, không xác nhận giao diện/cảm ứng Unity.

## Mở và build

1. Dùng Unity **6.3 LTS 6000.3.27f1**. Editor được cài tại `E:\Tools\Unity\6000.3.27f1`. Kích hoạt giấy phép hợp lệ qua Unity Hub trước khi chạy Editor.
2. Thêm thư mục `E:\Games\DenTinh\Unity` vào Hub rồi mở. Menu **Đèn Tinh → Chuẩn bị scene và cấu hình** tạo scene nếu chưa có; bấm Play.
3. Chọn **Đèn Tinh → Build Windows 64-bit** hoặc chạy `BUILD_UNITY.bat`. Kết quả tại `Unity/Builds/Windows/DenTinh.exe`. Windows dùng Mono, không cần Visual Studio/IL2CPP. WebGL cần cài thêm Web Build Support đúng phiên bản.

Bản Windows 0.8.3 có tại [GitHub Releases](https://github.com/dodat1306-eng/den-tinh/releases/tag/v0.8.3). Giải nén toàn bộ rồi mở `DenTinh.exe`; giữ các thư mục và DLL đi kèm.

Kiểm tra lõi độc lập Editor:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/Test-Unity-Core.ps1
```

## Lưu và tài nguyên

Unity lưu tại `Saves` cạnh bản chạy, hoặc `Unity/Saves` trong Editor, kèm `unity-save.json.bak`. Web và Unity có định dạng/tọa độ riêng, chưa tự chuyển tiến độ giữa hai nền tảng.

Nguồn mesh và bake: `design/blender/world`, `design/blender/actors`; ảnh chung tại `Unity/Assets/Resources/Art`. Đồ họa tự dựng cho dự án; Soul Knight là tham chiếu phong cách, không dùng tài nguyên của game đó.
