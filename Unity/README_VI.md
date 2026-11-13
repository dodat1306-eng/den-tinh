# Đèn Tinh 0.2 — dự án Unity 2D

Dự án Unity thật, viết bằng C#, dùng Camera trực giao, SpriteRenderer, hoạt ảnh khung hình, LineRenderer, ParticleSystem và AudioSource. Không nhúng trang web vào Unity. Phần logic thuần C# nằm trong `Assets/Scripts/Core`; dữ liệu nhân vật, vũ khí và di vật được xuất từ cùng catalog với bản trình duyệt bằng `tools/export-unity-content.cjs`.

## Trạng thái kiểm tra

- Lõi C# được biên dịch và kiểm tra độc lập bằng .NET Framework có sẵn trên máy.
- Editor/build Unity chưa được xác nhận chạy: máy chưa có Unity được cài và chưa kích hoạt tài khoản/giấy phép. Không có file `.exe` Unity đã phát hành trong gói này.
- Bản trình duyệt 0.7 ở thư mục cha là bản dùng được để chơi ngay trong khi hoàn thành cài đặt Unity.

## Mở và chạy bằng Unity

1. Cài Unity Hub từ [trang chính thức](https://unity.com/download), tự tạo/đăng nhập tài khoản và kích hoạt giấy phép phù hợp. Unity Personal cần đăng nhập Hub; không nhập mật khẩu vào script hoặc gửi trong chat.
2. Cài **Unity 6.3 LTS 6000.3.27f1**, chọn vị trí trên ổ E. Bộ cài chính thức, đã kiểm tra chữ ký và MD5, có sẵn tại `E:\Tools\UnityDownloads\UnitySetup64-6000.3.27f1.exe`.
3. Trong Hub chọn **Add → Add project from disk**, trỏ đến thư mục `E:\Games\DenTinh\Unity`.
4. Khi import xong, menu **Đèn Tinh → Chuẩn bị scene và cấu hình** tạo `Assets/Scenes/Main.unity`; bấm Play. Dự án cũng có bootstrap tạo game khi mở một scene trống.
5. Chọn **Đèn Tinh → Build Windows 64-bit** hoặc chạy `BUILD_UNITY.bat` ở thư mục cha. Bản xuất hiện tại `Unity/Builds/Windows/DenTinh.exe`.

Windows dùng Mono nên không cần cài Visual Studio/IL2CPP để xuất bản này. Nếu muốn WebGL, cài thêm Web Build Support đúng phiên bản, rồi dùng menu **Đèn Tinh → Build WebGL**. Điều khiển cảm ứng đã có trong runtime; chưa có APK được build hoặc kiểm tra trên điện thoại thật.

## Nội dung

- An, Linh, Kiệt, **Thiên Vũ** và **HoaVi**. HoaVi tích tối đa 8 Mã Lệnh, Q Debug Pulse tiêu thụ mã, E Firewall chặn đạn và hồi phục/cấp khiên, R Overclock kéo dài 7 giây và triển khai drone.
- Hai ô vũ khí, 12 loại, băng đạn, nạp lại, độ hiếm và nâng tối đa +5.
- 12 di vật thay đổi cách bắn, lướt, thiêu đốt, xuyên mục tiêu, lan điện, hồi máu và khả năng của Đốm.
- Săn miniboss Trúc Vệ, bảo vệ Đèn Sen 36 giây, phá ba lõi Tro; boss cuối có rễ bảo vệ và giai đoạn ba.
- Hướng dẫn bằng hành động, mảnh ký ức, thành tựu, nhạc theo vùng, điều chỉnh âm lượng, giảm chuyển động, cảm ứng và Hành trình + với seed mới.

## Thiên Vũ và atlas chung

- Thân quay theo phím di chuyển; đi chéo giữ cả hai trục và ưu tiên hướng ngang. Vũ khí/đạn ngắm riêng theo chuột. Đứng yên giữ hướng cuối.
- C hoặc 1–7 đổi nguyên tố; G chọn 3/5/7 dạng; X tách/hợp. Nhấn R mở chọn phân thân, giữ R 0,45 giây tách bảy dạng; nút tuyệt kỹ/hợp kích nằm trong bảng chọn. Nút R cảm ứng hỗ trợ nhấn/giữ; mất focus hủy lần giữ.
- Mỗi NPC có vị trí, vận tốc, HP, mục tiêu, động tác và hồi chiêu đánh/Q/E/R riêng; áp sát, chạy vòng hoặc thả diều theo vũ khí. Sát thương bằng 62% bản chính, không tiêu MP hay nạp R của chủ.
- Golem tồn tại 18 giây và hấp thụ sát thương; cây biến thành treant chiến đấu 30 giây. Đóng băng dừng cả AI/tấn công đúng 2 giây, trói chân chặn cả dịch chuyển của quái trong 2,5 giây. Dịch chuyển qua đền/hồi sinh dọn thực thể sở hữu; đổi vị trí hủy chiêu chờ.
- `Art/ThienVu.png` (1024×3968), `Art/ThienVuVFX.png` (1024×1728), `Art/ThienVuClips.json` (324 clip) được xuất từ atlas Web. PixelArt đổi tọa độ PNG từ trên xuống sang Sprite của Unity, dùng Point/Clamp, 32 PPU và pivot bàn chân. Importer giữ max 8192, không nén, không mipmap, không đổi kích thước NPOT.

```powershell
node tools/export-unity-content.cjs
powershell -NoProfile -ExecutionPolicy Bypass -File tools/Test-Unity-Core.ps1
```

Kiểm tra lõi: 17/17 bài cũ, 4/4 chiến dịch và 43 kiểm tra nguyên tố đạt. Chưa chạy Editor, kiểm tra giao diện/cảm ứng Unity hoặc build Windows/WebGL vì máy chưa cài Unity Editor. Bản Web đã kiểm tra Chrome và cảm ứng giả lập; không dùng kết quả đó để xác nhận runtime Unity.

## Lưu và dữ liệu

Unity lưu tại thư mục `Saves` cạnh bản chạy (hoặc `Unity/Saves` trong Editor). Bản sao gần nhất là `unity-save.json.bak`. Bản trình duyệt lưu theo định dạng cũ có mở rộng; hai bản có hệ tọa độ và định dạng riêng, không tự động chuyển tiến độ giữa hai nền tảng. Bản lưu 0.1 của trình duyệt được đọc và bổ sung dữ liệu 0.2, đồng thời có bản sao trước nâng cấp trong `runtime/backup-before-v02-20261030`.

Hình minh họa và sprite mới do công cụ tạo ảnh xây riêng cho dự án; không dùng nhân vật/tài nguyên của Soul Knight. Soul Knight là tham chiếu về trải nghiệm game 2D hành động.
