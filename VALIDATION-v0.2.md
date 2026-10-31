# Kiểm tra Đèn Tinh 0.2

Ngày chốt: 31/10/2026. Đây là báo cáo kiểm tra nguồn và bản trình duyệt cục bộ; không phải kết quả chạy Unity Editor.

| Phần | Kết quả |
| --- | --- |
| Kiểm tra nền gốc trình duyệt | 13/13 đạt |
| Kiểm tra tính năng 0.2 | 20/20 đạt |
| Mô phỏng chiến đấu trình duyệt | 4/4 nhân vật hoàn thành ba ấn và boss |
| Tài nguyên và ranh giới bản lưu qua LAN | 10/10 đạt |
| HTTP trên máy chủ 4174 | 7/7 đạt |
| Biên dịch và kiểm tra logic C# | 17/17 đạt bằng C# compiler .NET Framework có sẵn |
| Mô phỏng chiến đấu C# | 4/4 nhân vật hoàn thành ba ấn và boss |
| Import/Play/build Unity Editor | Chưa chạy xác nhận |
| Chơi trên điện thoại thật | Chưa xác nhận; điều khiển đã thử trong trình duyệt ở bố cục 900 × 480 |

Các mô phỏng chiến đấu dùng bắn, kỹ năng, né, bình máu, lựa chọn di vật và hồi sinh theo luật game. Di chuyển giữa đấu trường được rút ngắn; số giây trong log không phải thời lượng chơi thực tế. C# kiểm tra simulation độc lập, không kiểm tra API render/audio của Unity.

Đã xem trực tiếp trên trình duyệt: màn đầu bốn nhân vật và key art mới; HoaVi/Firewall/khiên; đổi hai ô vũ khí; bảng nội tại và mô tả kỹ năng; cần trái di chuyển và làm tiến hướng dẫn; cài đặt giảm chuyển động giữ lại sau đóng/mở. Không thấy lỗi/warning trong console ở lần kiểm tra cuối.

Máy chủ chính trả `serverVersion: 3`, `contentVersion: 0.2.0`, `lan: true`. Mọi file mới và hai ảnh trả HTTP 200. Bản lưu chủ máy được đối chiếu SHA-256, trùng với bản sao trước nâng cấp tại thời điểm chốt; toàn bộ chơi thử UI dùng máy chủ và file save QA riêng.

Giới hạn Unity: bộ cài 6000.3.27f1 chính thức đã tải, MD5 khớp manifest và chữ ký nhà phát hành hợp lệ. Cài tự động trả mã 2, chưa tạo Editor. Máy chưa kích hoạt giấy phép Unity. Dự án có scene bootstrap và build script nhưng chưa có `.exe` Unity đã xuất/kiểm tra. Xem `Unity/README_VI.md` để hoàn tất trên Unity Hub.

Báo cáo chi tiết ở `qa/test-report.json`, `qa/expansion-report.json`, `qa/playthrough-report.json`, `qa/http-report.json`, `qa/unity-core-tests.txt`, `qa/unity-combat-tests.txt`. Ảnh `qa/v02-hoavi-firewall.jpg` là bản trình duyệt đang chạy.
