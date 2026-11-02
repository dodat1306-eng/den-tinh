# Kiểm tra và cơ sở thiết kế Đèn Tinh 0.4

Ngày 02/11/2026. Đích phát hành: [game Cloudflare](https://den-tinh.dodat1306.workers.dev/).

## Tham khảo

- [Monsta — BoBoiBoy](https://monsta.com/animations/boboiboy/): trang nhượng quyền chính thức giới thiệu người hùng có sức mạnh điều khiển bảy nguyên tố. Áp dụng ý tưởng biến hình nguyên tố và vai trò khác nhau cho từng dạng.
- [Monsta — BoBoiBoy Kuasa 7](https://www.youtube.com/watch?v=SJoVLNQDi2s): đối chiếu thông tin giới thiệu của video từ kênh Monsta chính thức. Không dùng hình/âm thanh của video làm tài nguyên game.
- Cơ chế phân thân 3/5/7 là yêu cầu trực tiếp của người dùng. Thời gian, chi phí, AI, sát thương, kỹ năng và thiết kế Thiên Vũ là quyết định triển khai cho Đèn Tinh; không phải thông số canon của phim.

Thiên Vũ có tên, tạo hình, atlas, tên chiêu và âm thanh tạo riêng. Prompt, chế độ tạo ảnh và đường dẫn ở [ART-v0.4.md](ART-v0.4.md).

## Logic và chiến đấu

- `npm test`: **67/67** kiểm tra, gồm nền gốc 13, mở rộng 0.2 là 20, thế giới 0.3 là 16 và nguyên tố 0.4 là 18. Báo cáo mới ở `qa/elemental-report.json`.
- Kiểm tra thực thi từng Q, E, R; sát thương/khống chế của từng dạng; bộ đếm hồi dùng chung; đúng số đồng minh và nguyên tố; AI gây sát thương; đạn giữ nguyên tố ban đầu; đồng minh nhận đạn và có thể chết; đóng băng/độc/phản đạn có tác dụng; tuyệt kỹ không tự tích lại.
- Kiểm tra lưu/khôi phục dạng, số bản thể, thời gian còn lại và máu đồng minh; giới hạn dữ liệu đồng minh lỗi; đọc lại tiến độ HoaVi của bản cũ; dọn đồng minh và đòn chờ khi hồi sinh/dịch chuyển.
- `npm run test:combat`: **5/5 nhân vật** hoàn thành ba ấn và boss, không chết trong các lượt mô phỏng.
- `npm run test:frontier-combat`: **5/5 nhân vật** hoàn thành ba trạm khám phá, tổng sáu đợt hộ vệ, không chết. Thiên Vũ dùng phân thân bảy dạng khi đủ linh lực.
- Hai bộ mô phỏng chiến đấu dùng đòn, kỹ năng, bình máu, di vật/tài năng và lướt thông thường. Chỉ chuyển vị trí giữa các đấu trường để rút ngắn đi bộ; thời gian báo cáo không phải thời lượng một lượt chơi thực tế.

## Máy chủ và trình duyệt

- `npm run test:elemental-http`: **5/5** kiểm tra bằng máy chủ với tệp lưu tạm riêng. POST/GET bản lưu Thiên Vũ có sáu đồng minh thành công; dữ liệu lỗi/Origin ngoài không thể ghi đè; năm tài nguyên mới được phục vụ đúng byte; đường dẫn nội bộ trả 404. Không ghi vào `runtime/save.json`.
- Chrome 1280 × 720 và hồ sơ cảm ứng 844 × 390 / 390 × 844: **13/13** kiểm tra, không có lỗi JavaScript chưa xử lý. Dùng phím/nút thực để chọn nhân vật, mở bảng dạng, đổi bảy dạng, thi triển 21 chiêu, chọn 3/5/7, hợp kích, lưu/tải, thu hồi, Esc và bố cục cảm ứng. Báo cáo `qa/browser-v04-report.json`.
- Đo 160 lần dựng khung hình sau khi nền được tạo: trung bình khoảng **1,22 ms**, p95 **1,90 ms** trên máy thử nghiệm, khi bật phân thân và hợp kích. Đây là thời gian gọi renderer, không phải FPS toàn bộ vòng game và không bảo đảm hiệu năng mọi thiết bị.
- Ảnh kỹ năng dùng fixture độc lập nạp lại linh lực/lực R để thấy đủ hiệu ứng. Sát thương và cân bằng được kiểm tra riêng, không dùng ảnh này làm bằng chứng thắng trận. Cảm ứng là mô phỏng trên Chrome, chưa kiểm tra điện thoại vật lý.

## Phát hành và giới hạn

`npm run build:web` tạo allowlist **23 tệp game + `_headers`**, kiểm tra các tham chiếu HTML và giới hạn kích thước tài nguyên. Wrangler được ghim phiên bản trong `package.json`. Sau khi push, cần xác nhận Cloudflare Workers Builds thành công, đối chiếu SHA-256 từng tài nguyên từ link công khai và chạy lại kiểm tra trình duyệt trên URL đó. Báo cáo kiểm tra công khai được giữ riêng trong runtime để không thay đổi ảnh và báo cáo đã đóng gói vào commit.

Bản lưu chủ máy được đối chiếu SHA-256 với bản sao trước cập nhật. Web công khai chỉ dùng localStorage của mỗi người; không đồng bộ tiến độ giữa thiết bị, không phải co-op. Nội dung 0.4 ở đây chỉ áp dụng cho bản trình duyệt; Unity giữ nền nội dung 0.2 và chưa xuất Player.
