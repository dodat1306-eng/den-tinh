# Đèn Tinh 0.2 — dự án Unity 2D

Dự án Unity thật, viết bằng C#, dùng Camera trực giao, SpriteRenderer, hoạt ảnh khung hình, LineRenderer, ParticleSystem và AudioSource. Không nhúng trang web vào Unity. Phần logic thuần C# nằm trong `Assets/Scripts/Core`; dữ liệu nhân vật, vũ khí và di vật được xuất từ cùng catalog với bản trình duyệt bằng `tools/export-unity-content.cjs`.

## Trạng thái kiểm tra

- Lõi C# được biên dịch và kiểm tra độc lập bằng .NET Framework có sẵn trên máy.
- Editor/build Unity chưa được xác nhận chạy: máy chưa có Unity được cài và chưa kích hoạt tài khoản/giấy phép. Không có file `.exe` Unity đã phát hành trong gói này.
- Bản trình duyệt 0.2 ở thư mục cha là bản dùng được để chơi ngay trong khi hoàn thành cài đặt Unity.

## Mở và chạy bằng Unity

1. Cài Unity Hub từ [trang chính thức](https://unity.com/download), tự tạo/đăng nhập tài khoản và kích hoạt giấy phép phù hợp. Unity Personal cần đăng nhập Hub; không nhập mật khẩu vào script hoặc gửi trong chat.
2. Cài **Unity 6.3 LTS 6000.3.27f1**, chọn vị trí trên ổ E. Bộ cài chính thức, đã kiểm tra chữ ký và MD5, có sẵn tại `E:\Tools\UnityDownloads\UnitySetup64-6000.3.27f1.exe`.
3. Trong Hub chọn **Add → Add project from disk**, trỏ đến thư mục `E:\Games\DenTinh\Unity`.
4. Khi import xong, menu **Đèn Tinh → Chuẩn bị scene và cấu hình** tạo `Assets/Scenes/Main.unity`; bấm Play. Dự án cũng có bootstrap tạo game khi mở một scene trống.
5. Chọn **Đèn Tinh → Build Windows 64-bit** hoặc chạy `BUILD_UNITY.bat` ở thư mục cha. Bản xuất hiện tại `Unity/Builds/Windows/DenTinh.exe`.

Windows dùng Mono nên không cần cài Visual Studio/IL2CPP để xuất bản này. Nếu muốn WebGL, cài thêm Web Build Support đúng phiên bản, rồi dùng menu **Đèn Tinh → Build WebGL**. Điều khiển cảm ứng đã có trong runtime; chưa có APK được build hoặc kiểm tra trên điện thoại thật.

## Nội dung

- An, Linh, Kiệt và **HoaVi**. HoaVi tích tối đa 8 Mã Lệnh, Q Debug Pulse tiêu thụ mã, E Firewall chặn đạn và hồi phục/cấp khiên, R Overclock kéo dài 7 giây và triển khai drone.
- Hai ô vũ khí, 12 loại, băng đạn, nạp lại, độ hiếm và nâng tối đa +5.
- 12 di vật thay đổi cách bắn, lướt, thiêu đốt, xuyên mục tiêu, lan điện, hồi máu và khả năng của Đốm.
- Săn miniboss Trúc Vệ, bảo vệ Đèn Sen 36 giây, phá ba lõi Tro; boss cuối có rễ bảo vệ và giai đoạn ba.
- Hướng dẫn bằng hành động, mảnh ký ức, thành tựu, nhạc theo vùng, điều chỉnh âm lượng, giảm chuyển động, cảm ứng và Hành trình + với seed mới.

## Lưu và dữ liệu

Unity lưu tại thư mục `Saves` cạnh bản chạy (hoặc `Unity/Saves` trong Editor). Bản sao gần nhất là `unity-save.json.bak`. Bản trình duyệt lưu theo định dạng cũ có mở rộng; hai bản có hệ tọa độ và định dạng riêng, không tự động chuyển tiến độ giữa hai nền tảng. Bản lưu 0.1 của trình duyệt được đọc và bổ sung dữ liệu 0.2, đồng thời có bản sao trước nâng cấp trong `runtime/backup-before-v02-20261030`.

Hình minh họa và sprite mới do công cụ tạo ảnh xây riêng cho dự án; không dùng nhân vật/tài nguyên của Soul Knight. Soul Knight là tham chiếu về trải nghiệm game 2D hành động.
