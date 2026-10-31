# Đèn Tinh: Miền Sương Lạc — 0.2

Game hành động 2D tiếng Việt, một người chơi, lấy chất liệu từ làng Việt, rừng trúc, đầm sen và ký ức trong sương. Bản 0.2 thêm HoaVi, vũ khí, di vật, thử thách riêng, hình minh họa và sprite chuyển động mới.

## Chơi ngay

- Nhấp đúp **CHOI_GAME.bat** trong `E:\Games\DenTinh`, hoặc mở `http://127.0.0.1:4174/` khi máy chủ đã chạy.
- Chọn một trong bốn nhân vật rồi **Bắt đầu hành trình**. Có hướng dẫn bằng hành động trong làng, có thể bỏ qua trong Cài đặt.
- Muốn chia sẻ với người cùng Wi-Fi/LAN: chạy **CHOI_CHUNG_MANG.bat**. Địa chỉ hiện tại nằm trong `runtime/lan-info.json`. Giữ máy chủ bật và cùng kết nối mạng.
- Mỗi người chơi qua IP LAN có tiến độ riêng trong trình duyệt. Đây là các lượt chơi độc lập, chưa phải co-op.

Bản ZIP đầy đủ dùng Node.js đi kèm trong `runtime/node.exe`; không cần npm install, CDN hoặc tài khoản. Mã nguồn GitHub không chứa runtime thực thi: cài **Node.js 22 trở lên**, rồi chạy `npm start` hoặc `CHOI_GAME.bat`. Bộ khởi chạy ưu tiên runtime đi kèm và tự tìm Node.js trên PATH nếu không có. Muốn chia sẻ LAN từ source có thể chạy `npm run start:lan` hoặc `CHOI_CHUNG_MANG.bat`. Cache, hồ sơ trình duyệt của bộ khởi chạy và bản lưu máy chủ nằm trong thư mục dự án.

## Xuất bản web trên Cloudflare Workers

Dự án có thể xuất bản bằng Workers Static Assets, từ repository GitHub hoặc từ máy cá nhân:

```sh
npm run build:web
npm run deploy
```

Trong Cloudflare Workers Builds, chọn nhánh `main`, thư mục gốc `/`, build command `exit 0` và deploy command `npm run deploy`. Lệnh deploy tạo lại `dist/`, rồi dùng Wrangler phiên bản cố định để triển khai. `wrangler.jsonc` bật địa chỉ `workers.dev` và chỉ phục vụ `dist/`; tệp không tồn tại trả 404.

Bản web công khai lưu tiến độ riêng trong localStorage của từng trình duyệt. Không tải lên bản lưu chủ máy, Node runtime, công cụ kiểm tra hoặc dự án Unity. Khi dùng trên thiết bị khác, tiến độ không tự đồng bộ.

## Bản Unity

Thư mục **Unity/** chứa dự án C# Unity 6.3 LTS thật, dùng SpriteRenderer, hoạt ảnh sprite, Camera trực giao, LineRenderer, ParticleSystem và AudioSource. Logic C# đã được biên dịch và kiểm tra độc lập. **Chưa có bản .exe Unity được xuất và xác nhận chạy**, vì Editor chưa cài thành công và máy chưa có giấy phép Unity được kích hoạt.

Đọc [hướng dẫn Unity](Unity/README_VI.md). Dùng `MO_DU_AN_UNITY.bat` sau khi cài Editor 6000.3.27f1 và tự kích hoạt giấy phép trong Unity Hub; dùng `BUILD_UNITY.bat` để xuất Windows. Tiến độ Unity và trình duyệt lưu riêng, không tự đồng bộ qua hai bản.

## Bốn nhân vật

| Nhân vật | Nội tại | Q | E | R |
| --- | --- | --- | --- | --- |
| An — Người Giữ Đèn | Lửa linh đốt quái | Liên Hỏa | Vòng Trấn | Thiên Đăng |
| Linh — Trúc Ảnh | Di chuyển tăng tốc bắn | Xuyên Vân | Mưa Trúc | Phong Linh |
| Kiệt — Lôi Vệ | 8% giáp, lướt phát xung điện | Lôi Liên | Chấn Địa | Thiên Lôi |
| **HoaVi — Kiến Trúc Sư Mã Lệnh** | Đánh trúng tích tối đa 8 Mã Lệnh | **Debug Pulse**: năm luồng mã xuyên, tiêu thụ mã tăng sát thương/rút hồi chiêu | **Firewall**: chặn đạn, sát thương vùng, hồi 18 máu và thêm 32 khiên | **Overclock**: tăng tốc bắn 7 giây, hai drone, xóa đạn và hồi máu |

Tuyệt kỹ cần tích đủ 100% từ chiến đấu và không tự nạp năng lượng từ sát thương của chính nó.

## Vũ khí và di vật

Hai ô vũ khí độc lập, mỗi ô có băng đạn, thời gian nạp và cấp nâng riêng. Đạn dự trữ không giới hạn. Nhặt vũ khí bằng F; vũ khí cũ được thả ra ngoài tầm tương tác để tránh vòng đổi liên tục. Chú Bảy nâng vũ khí tối đa +5, mỗi cấp thêm 18% sát thương.

12 vũ khí: Đèn Lưu Hỏa, Cung Trúc Ảnh, Lôi Thương, Terminal 01, Liên Hoa Tán, Hỏa Pháo Tro Tàn, Ngọc Xuyên Sơn, Compiler X, Phong Lôi Cầm, Sen Nguyệt Kiếm, Firewall.exe, Rễ Ký Ức. Có thiêu đốt, xuyên, lan sét, nổ vùng và hồi phục.

12 di vật: Tâm Hỏa, Bền Rễ, Gió Trúc, Tâm Ngọc, Lửa Truyền, Dấu Chân Sấm, Nhánh Trúc, Xuyên Mây, Sương Sen, Mạch Lôi, Tản Nhiệt, Lời Hứa Của Đốm. Nhận từ lên cấp, ấn, rương, mảnh ký ức và cửa hàng. Xem nội tại, vũ khí và di vật bằng I.

## Hành trình

- **Rừng Trúc:** săn miniboss Trúc Vệ, né cú lao và loạt trúc.
- **Đầm Sen:** nhấn F ở ấn để bảo vệ Đèn Sen trong 36 giây; đèn tắt có thể thử lại.
- **Đồi Tro:** nhấn F ở ấn, phá ba lõi tro và né vòng lửa báo trước.
- **Cội Đa:** cần đủ ba ấn. Boss tạo rễ bảo vệ ở khoảng 65% máu; phá rễ để gỡ khiên. Dưới 30% máu thêm các cụm rễ xoay.

Làng Đèn là vùng nghỉ an toàn. Giếng Ngọc hồi đầy máu, linh lực và bổ sung ít nhất ba bình. Các ấn đã thức tỉnh đưa bạn về làng. Có ba mảnh ký ức, thành tựu và Đốm đánh dấu khám phá gần người. Thắng boss có thể khám phá tiếp hoặc bắt đầu **Hành trình +** với seed mới và quái mạnh hơn.

## Điều khiển

| Phím | Hành động |
| --- | --- |
| WASD / mũi tên | Di chuyển |
| Chuột / giữ trái | Ngắm / bắn |
| Space | Lướt né |
| Q, E, R | Kỹ năng và tuyệt kỹ |
| F | Tương tác, nhặt vũ khí |
| TAB / V | Đổi vũ khí / nạp băng |
| H | Hồi 55% máu tối đa |
| M, I, Esc | Bản đồ, thuộc tính, tạm dừng |

Trên điện thoại, game tự bật hai cần cảm ứng và nút kỹ năng; dùng nằm ngang để nhìn rộng. Có nút thuộc tính, cài đặt, tạm dừng và bản đồ. Có thể bật/tắt cảm ứng thủ công, chỉnh âm lượng nhạc/hiệu ứng, cỡ chữ và giảm rung/chớp trong Cài đặt. Đã kiểm tra điều khiển bằng trình duyệt ở bố cục điện thoại; chưa xác nhận chơi trên điện thoại thật của người dùng.

## Lưu và sao lưu

Tự lưu mỗi 12 giây và sau tương tác quan trọng. Bản chính chủ máy là `runtime/save.json`; có dự phòng trong hồ sơ trình duyệt. Chơi qua LAN dùng localStorage của từng trình duyệt, không được đọc/ghi bản lưu chủ máy.

Bản lưu 0.1 được đọc, giữ cấp độ/thuộc tính/xu/ấn và bổ sung dữ liệu mới. Bản sao nguồn và tiến độ trước nâng cấp nằm trong `runtime/backup-before-v02-20261030`. **Bắt đầu hành trình** mở lượt mới; **Tiếp tục** giữ lượt đang có. Sao lưu `runtime/save.json` trước khi chuyển máy hoặc xóa dữ liệu trình duyệt.

## Kiểm tra và mã nguồn

```sh
npm test
npm run test:combat
npm run test:lan
npm run test:http
npm run export:unity
```

Trên máy này có thể gọi `runtime/node.exe` thay `node`. Kiểm tra C# thuần bằng `tools/Test-Unity-Core.ps1`; kết quả ở `qa/unity-core-tests.txt`, `qa/unity-combat-tests.txt`. Các kiểm tra này không thay thế import, Play và build bằng Unity Editor.

`world.js`, `engine.js` là nền gốc; `content.js`, `expansion.js` chứa catalog/gameplay 0.2. `visuals.js`, `controls.js`, `expansion.css` mở rộng hình ảnh, UI và cảm ứng. `app.js` nối các phần. Unity có simulation C# riêng và catalog sinh từ cùng nguồn. `qa/` chứa báo cáo/screenshot cục bộ. Mô phỏng chiến đấu rút ngắn di chuyển giữa đấu trường, thời gian báo cáo không phải thời lượng chơi thực tế.

Hình minh họa, sprite và hiệu ứng làm riêng cho Đèn Tinh. Soul Knight là tham chiếu trải nghiệm game hành động 2D; không dùng nhân vật hoặc tài nguyên của trò chơi đó.

