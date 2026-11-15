# Đèn Tinh 0.9.1 — Unity Windows

Runtime C# dùng camera trực giao và SpriteRenderer. Lõi mô phỏng tại `Assets/Scripts/Core`; catalog chung xuất bằng `node tools/export-unity-content.cjs`.

## Nội dung

- 12 chỉ số RPG, 2 điểm chỉ số và 1 điểm kỹ năng mỗi cấp; I phân bổ và tẩy điểm 80 xu tại làng, K nâng kỹ năng. Không còn chọn Thiên Phú/Mastery khi lên cấp.
- 32 cổ vật: 12 Boss drop và 20 bệ đá. Vật phẩm phải đáp đất rồi nhấn F; bệ có quái canh, phong ấn và công cụ giải đố. Chân dung riêng cho 25 NPC, bốn tầng sự thật và năm tuyến nhân vật có thể hoàn thành.
- Chiến dịch ba ấn/Cội Đa, trả ký ức và đủ sáu chương tiếp nối. Mỗi chương có ba đợt và Boss; kết thúc mới mở tầng sự thật cuối.
- Đủ năm nhân vật, bảy dạng Thiên Vũ, X phân thân 3/5/7, R riêng từng dạng, intro tuyệt kỹ và bóng thú Quân Lê. Phân thân/golem/treant/bóng thú giữ HP, thời gian sống và chỉ số Thống Lĩnh qua save.
- Atlas pixel chung, Point filtering, môi trường có phá hủy/cháy/băng/tro. Thêm atlas cổ vật 32×32 và NPC 40×56.

## Chạy và build

1. Cài Unity **6000.6.9f1** cùng Windows Build Support (Mono), đăng nhập Hub và kích hoạt giấy phép.
2. Mở thư mục `Unity`. Menu **Đèn Tinh → Chuẩn bị scene và cấu hình** tạo scene nếu thiếu; bấm Play.
3. Chạy `BUILD_UNITY.bat` hoặc menu **Đèn Tinh → Build Windows 64-bit**. Script ưu tiên Unity CLI đã cài trên máy; bản chạy ở `Unity/Builds/Windows/DenTinh.exe`.

Tải [Windows 0.9.1](https://github.com/dodat1306-eng/den-tinh/releases/tag/v0.9.1), giải nén toàn bộ rồi mở `DenTinh.exe`, giữ DLL và thư mục đi kèm.

## Kiểm chứng

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/Test-Unity-Core.ps1
```

Bộ kiểm tra lõi gồm chiến dịch, nguyên tố, môi trường, bóng tối, tuyệt kỹ và 11 kiểm tra RPG mới. `DenTinh.Editor.ReleaseChecks.Validate` kiểm tra 72 điều kiện trong Editor, gồm JsonUtility qua 10 lượt cho mỗi nhân vật và dữ liệu hai atlas. Build Windows chạy thật bằng `--den-tinh-smoke --smoke-report <đường-dẫn-json>` để dựng năm nhân vật/sáu bảng giao diện và kiểm tra lưu/tải; dữ liệu smoke dùng thư mục tạm riêng.

Báo cáo tại [qa/v091/acceptance.json](../qa/v091/acceptance.json). Chưa kiểm tra WebGL, điện thoại thật hoặc chất lượng hình ảnh Unity bằng mắt. Kết quả Chrome chỉ xác nhận bản Web.

## Lưu và điều khiển

WASD di chuyển, chuột ngắm/đánh, Q/E/R kỹ năng, Space lướt, F tương tác, I nhân vật, K kỹ năng, J nhật ký, M bản đồ; C/1–7/G/X dùng dạng và phân thân Thiên Vũ.

Unity lưu tại `Saves` cạnh bản chạy, hoặc `Unity/Saves` trong Editor, có `unity-save.json.bak`. Web và Unity dùng dữ liệu lưu riêng, chưa chuyển tiến độ giữa hai nền tảng. Nguồn mesh/bake tại `design/blender`; atlas tại `Assets/Resources/Art`.
