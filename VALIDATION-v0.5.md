# Đèn Tinh 0.5 — kiểm chứng ngày 03/11/2026

## Kiểm tra logic

- `tools/ascension-test.cjs`: 43 kiểm tra tích hợp cho năm bộ chiêu, thời gian phát chiêu, bốn nhánh nâng cấp, chuyển/lưu tiến độ, 20 cổ vật, bảy nguyên tố, Hòa Âm và hủy hành động khi dịch chuyển/chết. Báo cáo `qa/ascension-report.json`.
- `tools/endless-test.cjs`: 11 kiểm tra về seed, tọa độ âm, giới hạn 25 vùng, lưu thay đổi khi rời/quay lại, bản lưu xa, phân thân, môi trường, sáu chương và sát thương hậu truyện. Báo cáo `qa/endless-report.json`.
- `tools/visual-math-test.cjs`: kiểm tra đúng atlas gốc cho năm nhân vật, bảy dạng và phân thân; tư thế, font, vẽ toàn cảnh ở tọa độ âm/xa, trường kỹ năng theo hình học và sáu boss. Báo cáo `qa/ascension-visual-report.json`. Canvas giả dùng để kiểm tra tài nguyên/lệnh vẽ, không tự chứng minh chất lượng hình ảnh.
- Các bộ kiểm tra lõi cũ: 13 nền gốc, 20 expansion, 16 frontier, 18 elemental. Chúng giữ kiểm tra lớp cũ và khả năng đọc nội dung trước đó; các kiểm tra trang bị cũ chỉ chạy ở lớp cũ, không phải hành vi trang bị của bản 0.5 cuối cùng.
- HTTP tích hợp: 5 kiểm tra module/font, lưu Thiên Vũ bảy bản thể, bản lưu lỗi, Origin và đường dẫn riêng tư. Kiểm tra HTTP cơ bản: 7. Kiểm tra LAN: 10; không mở thêm firewall trong đợt này.

## Chạy qua chiến đấu

`tools/ascension-playthrough.cjs` nạp toàn bộ stack 0.5, cho từng nhân vật hoàn thành ba ấn, Cội Đa, ba tiếng vọng của từng chương và cả sáu boss tiếp nối. **Cả năm nhân vật hoàn thành**; không đặt miễn thương hoặc sửa sát thương/máu địch để thắng. Dùng điểm kỹ năng/di vật có được, đòn thường, Q/E/R, bình và né theo điều khiển mô phỏng.

Script dịch chuyển giữa các đấu trường, bỏ thời gian đọc hội thoại và chọn nâng cấp bằng API. Kết quả xác nhận cơ chế cuộc đấu và điều kiện tiến độ; không dùng số giây trong báo cáo để quảng cáo thời lượng chơi hoặc khẳng định độ khó cho người thật. Báo cáo: `qa/ascension-playthrough-report.json`.

## Trình duyệt

Đã mở bản local trên Chrome và quan sát trực tiếp menu/font tiếng Việt; bắt đầu lượt thử, mở bảng K, học một bậc, tải lại và Tiếp tục xác nhận còn hai điểm và giữ bậc đã học. Các thử nghiệm dùng save riêng tại cổng 4175, không ghi đè tiến độ chính của chủ máy.

Lượt thử điều khiển cửa sổ trực tiếp trên Chrome sau đó bị công cụ dừng do không xác định chắc URL của cửa sổ Windows; đã dừng ở lượt đó. Khi người dùng yêu cầu tiếp tục, đã chuyển sang trình duyệt của chat và kiểm tra thêm: giữ D làm nhân vật đi và chuyển bước hướng dẫn; Q/E tiêu linh lực, hiện hành động và đèn tồn tại; bảng K giữ bậc đã học; danh mục hiển thị đúng 20 cổ vật. Không có lỗi console trong những cảnh đã kiểm tra.

Đã dùng một save QA dựng riêng để xem Hồ Tinh tại x=8879, y=-357: miền sinh ngoài biên cũ tải đúng, có thanh máu boss, ba neo, hình chín đuôi và sát thương thực nhận. Đây là cảnh kiểm tra hình ảnh được chuẩn bị sẵn, không phải bằng chứng tự chơi qua truyện. Mô phỏng chiến đấu ở mục trên kiểm tra tiến độ riêng. Chưa chơi tay toàn bộ các dạng và trận boss.

Ảnh: `qa/v05-an-lantern.png`, `qa/v05-an-cast.png`, `qa/v05-relics.png`, `qa/v05-ho-tinh.png`. Báo cáo trình duyệt: `qa/v05-browser-checks.json`.

Chưa kiểm tra trên điện thoại thật; chưa xác nhận offline lần đầu bằng chế độ máy bay; chưa xuất/kiểm tra Unity Player. Tài nguyên/font runtime đều đóng gói tại máy, không phụ thuộc CDN.

## Bản build, lưu và giới hạn

`tools/build-web.cjs` xuất 33 tệp game và `_headers` theo danh sách cho phép. Không xuất save, cache, hồ sơ trình duyệt, runtime Node hay dự án Unity lên web. Cloudflare Workers Builds triển khai từ nhánh `main` của GitHub. Sau khi build thành công, chạy `tools/verify-public.cjs` để đối chiếu đủ 33 tệp qua HTTP với bản local; kết quả được ghi tại `qa/cloudflare-v05-report.json`. Trạng thái build riêng lẻ không thay thế kiểm tra tệp đang phục vụ trên link công khai.

Save trước thay đổi có bản dự phòng tại `runtime/backup-before-v05-20261103`. Bản ZIP 0.5 chỉ chứa game, mã nguồn/công cụ cần thiết và Node kèm giấy phép; không chứa save và hồ sơ riêng.

Thế giới sinh không có biên cố định, nhưng bộ nhớ và lưu trữ của máy/trình duyệt vẫn hữu hạn. Chỉ các vùng đang ở gần được nạp; thay đổi đã tạo sẽ làm bản lưu lớn dần. Không hứa số vùng vô hạn được lưu với dung lượng cố định.
