# Đèn Tinh 0.7 — kiểm chứng ngày 07/11/2026

## Logic và render

165 kiểm tra: 151 kiểm tra có sẵn và 14 kiểm tra choreography mới. Bộ mới nạp toàn bộ lớp game 0.7 cùng renderer, kiểm tra tất cả nhân vật/bảy dạng ở các nhịp chiêu và hướng nhìn, số tam giác theo mức đồ họa, giữ atlas gốc, trả lại phương thức Canvas, đọc save cũ, chi phí phân thân 3/5/7, tư thế AI, chuyển dạng, tua lại/dịch chuyển, tạm dừng, dọn trạng thái và giới hạn hiệu ứng. Sát thương thực được đối chiếu với kết quả trước khi nạp lớp hình ảnh mới. Báo cáo: `qa/choreography-report.json`.

Canvas giả kiểm tra tọa độ, phương thức và trạng thái; chất lượng hình ảnh được xem riêng trên Chrome. Các phép kiểm tra Canvas không thay thế đo thực tế hoặc chứng minh chất lượng tạo hình.

Mô phỏng chiến đấu nạp cả các hook 0.7: cả năm nhân vật hoàn thành ba ấn, Cội Đa và sáu chương/boss hậu truyện, không chết trong lượt cuối. Không đặt miễn thương hoặc thay sát thương để thắng. Script rút ngắn đường đi, đọc thoại và chọn nâng cấp bằng API, nên thời gian mô phỏng không đại diện thời lượng/độ khó với người thật. Báo cáo: `qa/ascension-playthrough-report.json`.

HTTP tích hợp: 6 kiểm tra module/font/atlas và lưu đầy đủ tiến độ 0.6; HTTP nền: 7; LAN: 10. Dùng save/cổng fixture riêng. Không thay firewall hoặc ghi vào save chính.

## Chrome và clip

11 kiểm tra giao diện 0.6 đã chạy lại trên 0.7, gồm shop, giao dịch, kỹ năng, tải lại và cảm ứng. Thêm 27 mục kiểm tra/chỉ số ở `qa/browser-v07-motion-report.json`: đi thật, thời điểm Q, E/R riêng cho từng nhân vật, bảy bản thể có tư thế tung chiêu, hai mức đồ họa/giảm chuyển động, cảm ứng ngang 844×390 và dọc 390×844, ghi clip Canvas và lỗi JavaScript. Không có lỗi JavaScript chưa bắt trong các cảnh thử cuối.

Các ảnh và clip ở `runtime/qa-v07-release/`. Fixture cấp MP/năng lượng và chọn thời điểm để quan sát chiêu; chúng không phải bằng chứng người thật chơi qua game. Clip ghi Canvas bằng MediaRecorder trong Chrome, không dùng video sinh AI. Trên link công khai có thể chạy lại bằng biến `DENTINH_BROWSER_URL` và browser context mới.

Đã xem trực tiếp các ảnh R của An và Thiên Vũ. Vòng sửa cuối giảm các khối lửa/băng/đá và tia sáng che nhân vật. Mức đồng bộ vẽ bảy bản thể được ghi trong báo cáo (median/p95 cùng số tam giác); đây là thời gian gọi vẽ JS ở cảnh tạm dừng trong headless Chrome, không phải lời hứa FPS trên mọi máy. Chưa thử điện thoại vật lý, chưa chơi tay toàn bộ chiến dịch hoặc thay toàn bộ nhân vật bằng rig 3D.

## Blender, build và phát hành

Blender 5.2.3 LTS tạo 56 khung PNG và bake thành `assets/spirit-fx-v07.png`, 1024×896 RGBA. Tệp nguồn có geometry, vật liệu và keyframe. Không dùng bản nhân vật Mộc sắc đã bị loại trong game.

`npm run build:web` tạo 39 tệp game và `_headers` theo allowlist. `tools/verify-public.cjs` đối chiếu từng SHA-256 trên link công khai, cache revalidation và 11 đường dẫn riêng trả 404; báo cáo phát hành tại `runtime/cloudflare-v07-report.json`. Build thành công được kiểm tra riêng với tệp thực tế đang phục vụ.

Save chính được sao lưu tại `runtime/backup-before-v07-20261107` và đối chiếu hash trước/sau. Một lượt review qua 9Router kiểm tra phần wrapper render/trạng thái; các gợi ý được xét và kiểm tra tại máy, không dùng câu trả lời AI làm bằng chứng kiểm thử.

Có thể tái hiện bộ thử hình ảnh bằng `npm install --prefix runtime/qa-tools playwright`, sau đó `npm run test:browser-motion` (dùng Chrome đã cài). Chỉ thư viện QA nằm trong runtime; game web không tải thư viện này.


## Cập nhật HoaVi pixel — 13/11/2026

HoaVi dùng atlas 64×64 với 208 frame nhân vật, 24 frame bóng và 70 frame hiệu ứng. Đánh thường/Q/E/R đã nối vào game; Q lặp từ gốc đã lưu sau 0,35 giây, E hồi quy 12 lát, hai vệ tinh R dùng cùng ray sát thương. Canvas giữ lưới 2×, palette cố định và alpha 0/255. Nguồn Blender, script tái tạo và báo cáo nằm trong `design/blender/hoavi/`.

202 kiểm tra PASS: 169 logic/render, 5 kiểm tra pixel trên Chrome và 28 kiểm tra chuyển động/trình duyệt. Đã thử DPR 1/2, zoom 0,8/1,28/2, ray chéo/ngược/độ dài 0, lưu gốc Q, delay echo, hai đầu E và gốc ray vệ tinh. Cảnh combat và cảm ứng dùng fixture/giả lập.

Build hiện tại gồm 46 tệp game và `_headers`; `tools/verify-public.cjs` xác nhận hash toàn bộ tệp, cache và 11 đường dẫn riêng tư. Báo cáo local trước phát hành: `design/blender/hoavi/verification-pixel-v08.json`.
