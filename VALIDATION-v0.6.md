# Đèn Tinh 0.6 — kiểm chứng ngày 04/11/2026

## Logic và lưu game

`npm test`: 151 kiểm tra, gồm 13 nền gốc, 20 expansion, 16 frontier, 18 elemental, 43 ascension, 11 endless, 7 visual math và 23 journey. Các bộ cũ kiểm tra lớp nội dung tương ứng; riêng journey nạp lớp game cuối cùng 0.6. Báo cáo trong `qa/*-report.json`.

23 kiểm tra journey xác nhận giao dịch và tồn kho, bộ hàng giữ khi tải lại, giới hạn bình/bùa, nâng cấp làng qua hành trình mới, không cấp lại bình khi tải save, chi phí/cap điểm dư, chuyên hóa độc quyền và tác dụng thật của tên xuyên/nổ, hồi phục, hồi chiêu/trường, hủy thu thế giữ đòn chờ, miễn thương Kiệt, kéo/nổ đèn An, hồi nội tại Hòa Âm, tỷ lệ/seed tinh anh, làm chậm đúng lúc trúng, XP sương, lưu ba đợt thử thách và chống nhận thưởng lặp. Đọc được save 0.5 và chặn số liệu bổ sung vượt giới hạn.

HTTP: sáu kiểm tra tích hợp module/font cùng bản lưu thật có bảy bản thể, điểm dư, chuyên hóa, giao dịch, nâng cấp làng và thử thách đang chạy; từ chối save lỗi/Origin lạ, không phục vụ tệp riêng. Thêm bảy kiểm tra HTTP nền và mười kiểm tra LAN. Dùng cổng tạm cùng save fixture riêng; không sửa save của chủ máy và không đổi firewall. `tools/http-test.cjs` tự mở máy chủ fixture nếu không đặt `DENTINH_TEST_BASE`.

## Chiến đấu và giao diện

`tools/ascension-playthrough.cjs` nạp toàn bộ lớp 0.6. Năm nhân vật đều hoàn thành ba ấn, Cội Đa và sáu chương/boss hậu truyện, không chết trong lượt mô phỏng cuối. Không sửa máu/sát thương hoặc đặt miễn thương để thắng. Bộ điều khiển dùng đòn, kỹ năng, né, bình và điểm kiếm được; ưu tiên lõi nhiệm vụ khi có nhiều quái. Không tự mua các chuyên hóa/điểm dư mới để vượt chiến dịch; chúng được kiểm tra riêng.

Mô phỏng rút ngắn đường đi, đọc thoại và chọn nâng cấp bằng API. Kết quả xác nhận đường tiến độ và cơ chế trận đánh, không chứng minh độ khó cân bằng hoàn hảo hoặc thời lượng chơi của người thật. Báo cáo: `qa/ascension-playthrough-report.json`.

Chrome headless/Playwright: 11 kiểm tra giao diện, không có lỗi JavaScript chưa bắt trong các cảnh đã thử. F mở đúng cửa hàng, giao dịch thật thay đổi state, K tiêu điểm và chọn chuyên hóa, B dùng bình, tải lại giữ nâng cấp, tương tác Đài Tế sinh thật, vẽ sương/tinh anh; cảm ứng tại 844×390 và 390×844 mở K, chứa nút bình trong màn hình, E nổ đèn ngay trong hồi chiêu. Fixture cấp xu/điểm để thử UI; không dùng chúng làm bằng chứng độ khó chiến đấu. Báo cáo: `qa/browser-v06-report.json`.

Đã xem ảnh thật của cửa hàng, bảng kỹ năng và cảnh sương/tinh anh. Chưa thử điện thoại vật lý hoặc chơi tay toàn bộ chiến dịch. Giữ hình nhân vật gốc, thêm hiệu ứng Canvas; không tuyên bố đã dựng lại đồ họa toàn game.

## Build và phát hành

`npm run build:web` tạo 37 tệp game cùng `_headers`, chỉ từ danh sách cho phép. Wrangler được kiểm tra bằng `deploy --dry-run`. Cloudflare Workers Builds theo nhánh `main` đã nhận commit nhưng kẹt ở bước khởi tạo môi trường; bản 0.6 được triển khai trực tiếp bằng ZIP của `dist/` qua Dashboard, phiên bản `a83919e2`, trạng thái Ready/100% traffic. Không đổi tài khoản, token hoặc quyền truy cập.

Sau triển khai, `tools/verify-public.cjs` đã đối chiếu khớp SHA-256 của cả 37 tệp và xác nhận 11 đường dẫn riêng trả 404; báo cáo tại `runtime/cloudflare-v06-report.json`. Bộ thử trình duyệt chạy trên link công khai bằng `DENTINH_BROWSER_URL`, với browser context mới và báo cáo trong `runtime/qa-public-v06-20261104/`.

Save chính được sao lưu tại `runtime/backup-before-v06-20261103` và đối chiếu hash trước/sau. Không đưa runtime, save, cache hay hồ sơ trình duyệt lên GitHub/Cloudflare. Hồ sơ nâng cấp làng nằm trong localStorage trên cùng trình duyệt, không có đồng bộ tài khoản; xóa dữ liệu trang sẽ xóa hồ sơ. Chiêu/đạn/hiểm họa tạm thời không được phục hồi qua save; thử thách đang chạy và quái của nó được lưu riêng. Không thay bản Unity cũ hoặc cung cấp Unity Player mới.
