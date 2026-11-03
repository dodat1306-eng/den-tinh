# Đèn Tinh: Miền Sương Lạc — 0.5

Game hành động 2D tiếng Việt, một người chơi. Bản 0.5 chuyển sang **bảo khí cố định theo nhân vật và phát triển kỹ năng**, thêm thế giới sinh liên tục, sáu chương hậu truyện và 20 cổ vật truyền thuyết.

## Chơi tại máy

Nhấp đúp **CHOI_GAME.bat** trong `E:\Games\DenTinh`. Bộ khởi chạy dùng Node.js đi kèm, mở game tại `http://127.0.0.1:4174/` và tự thay máy chủ cũ khi cần. Không cần tải thư viện hay font từ CDN.

Dùng **Tiếp tục** để giữ tiến độ. **Bắt đầu hành trình** tạo lượt mới với nhân vật được chọn. Bản lưu 0.1–0.4 vẫn đọc được: giữ nhân vật, cấp, tiền, di vật, ấn và trạm đã mở; cấp nâng trang bị cũ đổi thành điểm kỹ năng.

Chơi trực tuyến tại **[den-tinh.dodat1306.workers.dev](https://den-tinh.dodat1306.workers.dev/)**. Mã nguồn: **[dodat1306-eng/den-tinh](https://github.com/dodat1306-eng/den-tinh)**. Bản web lưu tiến độ riêng trong từng trình duyệt; dùng **Tiếp tục** để đọc lại tiến độ. Nếu trang còn hiện giao diện cũ sau cập nhật, nhấn **Ctrl + F5**.

Cloudflare Workers Builds theo dõi nhánh `main`, chạy `npm run deploy` để tạo lại `dist/` và triển khai. Thay đổi ở máy chỉ lên web sau khi được đẩy lên GitHub và bản build thành công. Lệnh `node tools/verify-public.cjs` đối chiếu SHA-256 của toàn bộ 33 tệp công khai với `dist/`, kiểm tra cache và các đường dẫn riêng tư trả 404.

## Các thay đổi chính

- Mỗi nhân vật gắn với một bảo khí riêng; bỏ đổi ô trang bị, băng đạn, nạp đạn, nhặt và nâng vũ khí rơi.
- **K** mở bốn nhánh Q, E, R và nội tại, mỗi nhánh ba bậc. Khởi đầu có ba điểm; lên cấp, nối chương và khám phá môi trường cho thêm điểm.
- **I** mở mô tả nội tại dài, thuộc tính, cổ vật và hành trình. Cổ vật mới có nguồn truyện và cơ chế chiến đấu riêng.
- Giữ hình nhân vật gốc trong các atlas, gồm đủ bảy dạng Thiên Vũ. Nhịp chạy, hướng ngắm, độ nghiêng và chuyển động lấy đà/ra đòn/thu thế được áp dụng lên sprite; hiệu ứng tồn tại được vẽ theo hình tác động.
- Font Noto Sans tiếng Việt được đóng gói tại máy cho DOM và chữ trên canvas; không thay font hệ điều hành.
- Vẫn có đồ họa **Tự động / Chi tiết cao / Nhẹ**, giảm rung/chớp, âm lượng và điều khiển cảm ứng trong Cài đặt.

## Năm lối chơi

| Nhân vật | Nội tại và cách phối hợp | Q / E / R |
| --- | --- | --- |
| An · Tâm Đăng | Đánh địch đang cháy để tích sáu Tàn Lửa; đặt tối đa ba đèn có dây nối, hồi máu khi đứng gần | Quét lửa hình quạt / đặt đèn kết giới / phượng hỏa dọc hướng ngắm |
| Linh · Cung Trúc Hồi Âm | Chạy tích tám Nhịp Trúc, đòn cường hóa xuyên và ghim dấu; Q bắn nối dấu | Giương cung xuyên tuyến / lộn lùi đặt bẫy / thiên tiễn lần lượt săn mục tiêu |
| Kiệt · Lôi Thương | Đâm, lướt và chặn đạn tích năm Lôi Tức; Q cường hóa lao thương | Đâm xuyên hàng / chiến tuyến chặn đạn / bốn cọc lôi nối thành thiên lao |
| HoaVi · Ấn Biên Dịch | Tích tám Mã Lệnh, tiêu mã để lặp Q; E có thể nhấn lần hai trong năm giây để trở về điểm lưu | Debug tuyến mã / Checkpoint hồi quy / hai vệ tinh quét tia |
| Thiên Vũ · Thất Linh Tâm Ấn | Kỹ năng trúng bằng ba nguyên tố khác nhau tạo Hòa Âm, hoàn linh lực và khiên; đổi dạng tạo phản ứng | 21 kỹ năng của bảy dạng; vẫn có phân thân 3/5/7 và hợp kích |

Thiên Vũ giữ bảy dạng Lôi, Phong, Thổ, Hỏa, Băng, Mộc, Quang. **C** mở chọn dạng, **1–7** đổi nhanh, **G** chọn tổng số bản thể, **X** tách/hợp. Phân thân là đồng minh AI, có máu và thời gian tồn tại; chưa có co-op.

Tuyệt kỹ cần 100% lực từ chiến đấu. Sát thương từ R, phân thân và các đòn phụ của cổ vật không tự nạp R.

## Thế giới và môi trường

Giữ nguyên làng và vùng gốc 6400 × 4480 cùng nhiệm vụ ba ấn/Cội Đa. Khi đi qua biên cũ, game sinh các miền đất tiếp theo theo seed, cả tọa độ âm; không còn tường biên bản đồ. Rừng, sen, tro, di tích, đồng gió và suối ngọc xuất hiện ở vùng mới.

Chỉ giữ tối đa **25 vùng 1024 px** quanh người chơi. Quái bị hạ hoặc bị thương, rương đã mở, vật thể đã dùng và đạo cụ đã phá được ghi thành thay đổi nhỏ để giữ đúng khi quay lại hoặc tải bản lưu. Đây là thế giới sinh thủ tục không có điểm kết thúc cố định; nội dung từng vùng không được viết tay toàn bộ.

Nhấn **F** ở bếp lửa, quặng, cây nguyện, miếu và thùng nhựa thông. Bếp lửa hồi sức và đặt điểm hồi sinh; quặng/miếu/cây cho cổ vật. Lửa nổ thùng nhựa thông, Thổ phá quặng và đá ở vùng sinh, Mộc đánh thức cây nguyện, Lôi kích hoạt miếu. Cổ vật Thủy Phủ tạo nước phản ứng với Hỏa/Băng/Lôi. Các vật thể có thể dùng và cho thưởng một lần theo trạng thái.

## Sáu chương tiếp nối

Sau khi giải thoát Cội Đa, theo mũi hướng nhiệm vụ tới trạm ở Bến Nước Không Tên. Mỗi chương có hội thoại mở, ba tiếng vọng, người canh cần đối mặt và đoạn kết kèm cổ vật, 150 xu, hai điểm kỹ năng.

| Chương | Boss và cơ chế chính |
| --- | --- |
| Bến Nước Không Tên | Hà Bá: sóng vành khăn có khoảng an toàn ở giữa, tuyến sóng song song |
| Rừng Gương Hồ Tinh | Hồ Tinh chín đuôi: phá ba gương/neo để gỡ khiên, né đường cắt chéo |
| Miếu Chuông Quên Giờ | Thần Trùng: các tuyến báo đòn theo nhịp chuông ba |
| Khe Chín Dòng | Cửu Khúc Xà: quạt nanh và cú lao theo tuyến khóa hướng |
| Tháp Đếm Những Vì Sao | Thiết Điểu: tia quay, hai lõi yếu và chim hộ vệ |
| Khung Cửi Bên Kia Chân Trời | Kẻ Dệt Sương: vòng dệt có khe hở, neo ký ức và tia chéo |

Kết thúc sáu chương vẫn được khám phá tiếp. Tuyến truyện là sáng tác fantasy; các vị thần và yêu quái là cách diễn giải cho thế giới game.

## Hai mươi cổ vật mới

**Việt Nam:** Móng Kim Quy, Đốt Tre Phù Đổng, Dây Đàn Thạch Sanh, Hạt Sương Chử Đồng Tử, Ấn Núi Tản Viên, Giọt Nước Thủy Phủ, Hài Gấm Tấm, Hạt Dưa Mai An Tiêm, Lá Đa Chú Cuội, Lá Trầu Nghĩa Tình.

**Thế giới:** Ấn Búa Mjölnir, Mảnh Khiên Aegis, Lông Cánh Hermes, Sợi Chỉ Ariadne, Lông Phượng Hoàng, Nút Sinh Mệnh Ankh, Sợi Lông Tề Thiên, Tàn Đèn Aladdin, Hạt Đậu Jack, Mảnh Hài Thủy Tinh.

Các hiệu ứng như chặn đòn chí tử, biên dịch thêm đòn, dây leo, phản đạn và cộng hưởng được sáng tạo cho game. Không trình bày hiệu ứng hư cấu là chi tiết có thật trong truyện. Mười hai di vật cũ vẫn đọc được và hoạt động.

## Điều khiển

| Phím | Hành động |
| --- | --- |
| WASD / mũi tên | Di chuyển |
| Chuột / giữ trái | Ngắm / đánh thường, không cần nạp |
| Space | Lướt né |
| Q, E, R | Kỹ năng, tuyệt kỹ |
| F | Tương tác |
| K / I | Học kỹ năng / nhân vật và cổ vật |
| H | Dùng bình máu |
| M / Esc | Bản đồ lân cận / tạm dừng |
| C, 1–7, G, X | Chọn dạng và phân thân của Thiên Vũ |

Trên điện thoại có hai cần và các nút kỹ năng/K; nên dùng màn hình ngang. Cảm ứng chưa được xác nhận trên điện thoại thật của người dùng.

## Lưu và bản dự phòng

Tự lưu mỗi 12 giây và sau các thao tác quan trọng. Chủ máy dùng `runtime/save.json`; LAN và bản web dùng tiến độ riêng của từng trình duyệt. Bản dự phòng trước 0.5 nằm ở `runtime/backup-before-v05-20261103`. Bộ ZIP phát hành không chứa save, hồ sơ trình duyệt hoặc cache của chủ máy.

Phân thân giữ dạng, HP và vị trí hợp lệ khi tải lại ở miền xa. Các chiêu đang chờ, trường kỹ năng và checkpoint không được khôi phục qua bản lưu; chết, hồi sinh và dịch chuyển hủy chúng.

## Kiểm tra và đóng gói

```sh
npm test
npm run test:combat
npm run test:elemental-http
npm run test:lan
npm run build:web
```

Máy này có thể dùng `runtime/node.exe` thay `node`. `test:combat` nạp toàn bộ logic 0.5, cho năm nhân vật hoàn thành ba ấn, Cội Đa và sáu chương tiếp nối bằng đòn/kỹ năng thật. Nó rút ngắn di chuyển giữa đấu trường; thời gian mô phỏng không đại diện cho thời lượng chơi hoặc độ khó với người thật.

Xem [thay đổi 0.5](CHANGELOG-v0.5.md), [kiểm chứng và giới hạn](VALIDATION-v0.5.md), [nguồn tham khảo](ART-v0.5.md). [README 0.4](README-v0.4.md) được giữ làm lịch sử.

Nội dung mới áp dụng cho bản trình duyệt. Dự án Unity vẫn giữ nền nội dung cũ và chưa có bản .exe đã xuất/xác nhận; không đồng bộ tiến độ giữa hai bản.

