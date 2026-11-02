# Kiểm tra và cơ sở thiết kế Đèn Tinh 0.3

Ngày: 02/11/2026 (Việt Nam). Mục tiêu xuất bản: https://den-tinh.dodat1306.workers.dev/.

## Tham khảo nền tảng game

| Nguồn chính thức đã đọc | Điều áp dụng vào Đèn Tinh |
| --- | --- |
| [Soul Knight — ChillyRoom trên Google Play](https://play.google.com/store/apps/details?id=com.ChillyRoom.DungeonShooter) | Giữ điều khiển ngắm/bắn đơn giản, phân biệt nhân vật bằng kỹ năng và hiệu ứng riêng. |
| [Enter the Gungeon — Dodge Roll/Devolver trên Steam](https://store.steampowered.com/app/311690/Enter_the_Gungeon/) | Kết hợp điểm chiến đấu được bố trí rõ với môi trường sinh theo seed; phần thưởng sau thử thách; đạn và chuyển động né cần dễ đọc. |
| [Dead Cells — Motion Twin trên Steam](https://store.steampowered.com/app/588650/Dead_Cells/) | Thế giới có đường rẽ và vùng nối nhau; khám phá mở thêm điểm đi lại; ưu tiên phản hồi điều khiển. |

Các quyết định trên là diễn giải thiết kế cho Đèn Tinh. Không sao chép tài nguyên, map, mã nguồn hay nhân vật của ba trò chơi. Sprite mới được tạo riêng; prompt và đường dẫn ở ART-v0.3.md.

## Kiểm tra tự động

- `npm test`: 13 kiểm tra nền gốc, 20 kiểm tra bản 0.2 và 16 kiểm tra mở rộng bản 0.3.
- Kiểm tra đường đi bằng flood fill trên ba seed 71426, 1306 và 20261102: mọi ấn, NPC, rương và trạm đều có thể tiếp cận trên bộ; hai cầu qua sông đi được, nước và biên chặn người chơi.
- Kiểm tra bản lưu 0.2 giữ nhân vật, máu, xu, giáp, vũ khí, di vật và ấn. Lưu giữa đợt hộ vệ, tải lại vẫn giữ ID và số đợt; không nhân đôi quái.
- `npm run test:combat`: cả An, Linh, Kiệt và HoaVi hoàn thành ba ấn và Mộc Quỷ; không chết trong bốn lượt mô phỏng.
- `npm run test:frontier-combat`: cả bốn nhân vật hoàn thành ba trạm / sáu đợt hộ vệ; không chết trong bốn lượt mô phỏng. Dùng đòn đánh, kỹ năng, tài năng, bình máu và lướt thông thường, không tăng máu hoặc sát thương bằng lệnh. Bộ điều khiển tránh vật cản. Chỉ chuyển vị trí giữa các đấu trường; thời gian di chuyển ngoài đấu trường không tính trong báo cáo.
- HTTP được kiểm tra bằng máy chủ và đường dẫn lưu tạm riêng; không ghi vào tiến độ chủ máy. Bản lưu chủ máy được so SHA-256 với bản sao trước cập nhật.

## Trình duyệt và giới hạn

Chrome được chạy trong hồ sơ thử nghiệm riêng. Kiểm tra màn hình 1280 × 720, cảm ứng ngang 844 × 390 và xoay dọc 390 × 844; di chuyển bằng bàn phím/cần điều khiển, nút Firewall, các điểm đến dịch chuyển, lưu rồi tải lại, bản đồ, cài đặt và giảm chuyển động. Lỗi JavaScript phải bằng 0. Ảnh minh họa dùng camera được đặt sẵn; ảnh kỹ năng có nạp tuyệt kỹ trong fixture để nhìn đầy đủ hiệu ứng. Chúng không được dùng làm bằng chứng độ khó chiến đấu.

Đo thời gian dựng khung hình sau khi nền đã được tạo, với 16 quái và kỹ năng HoaVi. Fixture hiệu năng dùng miễn sát thương để giữ cảnh ổn định; không dùng nó để đánh giá khả năng thắng. Chỉ số trong `qa/browser-v03-report.json` phản ánh máy thử nghiệm này, không phải bảo đảm FPS trên mọi máy. Chưa kiểm tra điện thoại vật lý.

Khi xuất bản, chỉ các tệp trong allowlist của `tools/build-web.cjs` được sao vào `dist/`. Kiểm tra công khai cần đối chiếu SHA-256 từng tệp và xác nhận `/save`, `/runtime/`, công cụ máy chủ và cấu hình không được phục vụ. Bản web dùng localStorage riêng của người chơi.

Các kiểm tra C# của bản 0.2 không chứng minh nội dung trình duyệt 0.3 đã được chuyển sang Unity; đợt này không xuất Unity Player.
