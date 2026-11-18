# Đèn Tinh 1.0.0 — Unity Windows

Quỳnh Kun (nhân vật thứ sáu) và AIT-01 (nhân vật thứ bảy) dùng atlas mesh Blender chung với web. Quỳnh Kun khắc Ấn Chu Sa kích Phù Bạo, Q cường hóa ba đạo bùa, E cường hóa hai cọc và E lần hai Thu Phù. AIT-01 điều khiển 6 ô cửa sổ Kho Không Gian bay quanh thân, khóa mục tiêu kích nổ tên lửa RPG, Q Truy Xuất Hỏa Lực, E Điều Phối Ô Kho / Thu Hồi Ô Kho và R Toàn Kho Khai Hỏa · Hòm Tiếp Tế. Kiểm thử riêng: `Tests/QuynhKunTests.cs` và `Tests/Ait01Tests.cs`.

Runtime C# dùng camera trực giao và SpriteRenderer. Lõi mô phỏng tại `Assets/Scripts/Core`; catalog chung xuất bằng `node tools/export-unity-content.cjs`.

## Nội dung

- 12 chỉ số RPG, 2 điểm chỉ số và 1 điểm kỹ năng mỗi cấp; I phân bổ và tẩy điểm 80 xu tại làng, K nâng kỹ năng. Không còn chọn Thiên Phú/Mastery khi lên cấp.
- 32 cổ vật: 12 Boss drop và 20 bệ đá. Vật phẩm phải đáp đất rồi nhấn F; bệ có quái canh, phong ấn và công cụ giải đố. Chân dung riêng cho 25 NPC, bốn tầng sự thật và sáu tuyến nhân vật có thể hoàn thành.
- Chiến dịch ba ấn/Cội Đa, trả ký ức và đủ sáu chương tiếp nối. Mỗi chương có ba đợt và Boss; kết thúc mới mở tầng sự thật cuối.
- Đủ bảy nhân vật, bảy dạng Thiên Vũ, X phân thân 3/5/7, R riêng từng dạng, intro tuyệt kỹ, bóng thú Quân Lê, bùa trận Quỳnh Kun và kho vũ khí không gian AIT-01. Phân thân/golem/treant/bóng thú giữ HP, thời gian sống và chỉ số Thống Lĩnh qua save.
- Atlas pixel chung, Point filtering, môi trường có phá hủy/cháy/băng/tro. Thêm atlas cổ vật 32×32 và NPC 40×56.

## Chạy và build

1. Cài Unity **6000.6.9f1** cùng Windows Build Support (Mono), đăng nhập Hub và kích hoạt giấy phép.
2. Mở thư mục `Unity`. Menu **Đèn Tinh → Chuẩn bị scene và cấu hình** tạo scene nếu thiếu; bấm Play.
3. Chạy `BUILD_UNITY.bat` hoặc menu **Đèn Tinh → Build Windows 64-bit**. Script ưu tiên Unity CLI đã cài trên máy; bản chạy ở `Unity/Builds/Windows/DenTinh.exe`.

Tải gói phát hành tại [GitHub Releases](https://github.com/dodat1306-eng/den-tinh/releases), giải nén toàn bộ rồi mở `DenTinh.exe`, giữ DLL và thư mục đi kèm.

## Kiểm chứng

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/Test-Unity-Core.ps1
```

Bộ kiểm tra lõi gồm chiến dịch, nguyên tố, môi trường, bóng tối, tuyệt kỹ và 11 kiểm tra RPG mới. `DenTinh.Editor.ReleaseChecks.Validate` kiểm tra 72 điều kiện trong Editor, gồm JsonUtility qua 10 lượt cho mỗi nhân vật và dữ liệu hai atlas. Build Windows chạy thật bằng `--den-tinh-smoke --smoke-report <đường-dẫn-json>` để dựng năm nhân vật/sáu bảng giao diện và kiểm tra lưu/tải; dữ liệu smoke dùng thư mục tạm riêng.

Báo cáo tại [qa/v091/acceptance.json](../qa/v091/acceptance.json). Chưa kiểm tra WebGL, điện thoại thật hoặc chất lượng hình ảnh Unity bằng mắt. Kết quả Chrome chỉ xác nhận bản Web.

## Lưu và điều khiển

WASD di chuyển, chuột ngắm/đánh, Q/E/R kỹ năng, Space lướt, F tương tác, I nhân vật, K kỹ năng, J nhật ký, M bản đồ; C/1–7/G/X dùng dạng và phân thân Thiên Vũ.

Unity lưu tại `Saves` cạnh bản chạy, hoặc `Unity/Saves` trong Editor, có `unity-save.json.bak`. Web và Unity dùng dữ liệu lưu riêng, chưa chuyển tiến độ giữa hai nền tảng. Nguồn mesh/bake tại `design/blender`; atlas tại `Assets/Resources/Art`.
