# Đèn Tinh: Miền Sương Lạc — 0.8.3

Game hành động 2D tiếng Việt, một người chơi. Bản **0.8** làm lại chín quần xã, cây/đá/kiến trúc, năm quái thường, bảy boss, NPC và triệu hồi bằng mesh Blender đa diện. Toàn bộ atlas mới dùng **1 texel = 2 × 2 pixel**, viền đen và bốn bậc màu. Cây cháy lan, thành thân than rồi tro; băng vỡ, chém cây và bước qua tro đều để lại dấu vết. Trạng thái được giữ khi tải bản lưu hoặc quay lại vùng cũ.

**0.8.3** tách R Thiên Vũ khỏi X: R thi triển riêng nguyên tố sau 0,28 giây; X mở trận đồ 3/5/7 trong 4,2 giây rồi duy trì phân thân 18 giây. Sửa atlas Đại Kiếm Sét, hướng đánh và đạn Quân Lê; phân thân, bóng thú, golem và cây tự săn địch, tuần tra độc lập. HoaVi có 6–12 mắt laser trong 18–25,5 giây. Web và Unity dùng chung atlas. Xem [thay đổi 0.8.3](CHANGELOG-v0.8.3.md) và [trạng thái Unity](Unity/README_VI.md).

## Chơi tại máy

Nhấp đúp **CHOI_GAME.bat** trong `E:\Games\DenTinh`. Bộ khởi chạy dùng Node.js đi kèm, mở game tại `http://127.0.0.1:4174/` và tự thay máy chủ cũ khi cần. Không cần tải thư viện hay font từ CDN.

Dùng **Tiếp tục** để giữ tiến độ. **Bắt đầu hành trình** tạo lượt mới với nhân vật được chọn. Bản lưu 0.1–0.5 vẫn đọc được: giữ nhân vật, cấp, tiền, di vật, ấn và trạm đã mở; cấp nâng trang bị cũ đổi thành điểm kỹ năng. Nâng cấp làng của 0.6 được giữ qua hành trình mới trên cùng trình duyệt.

Chơi trực tuyến tại **[den-tinh.dodat1306.workers.dev](https://den-tinh.dodat1306.workers.dev/)**. Mã nguồn: **[dodat1306-eng/den-tinh](https://github.com/dodat1306-eng/den-tinh)**. Bản web lưu tiến độ riêng trong từng trình duyệt; dùng **Tiếp tục** để đọc lại tiến độ. Nếu trang còn hiện giao diện cũ sau cập nhật, nhấn **Ctrl + F5**.

Cloudflare Workers Builds theo dõi nhánh `main`, chạy `npm run deploy` để tạo lại `dist/` và triển khai. Thay đổi ở máy chỉ lên web sau khi được đẩy lên GitHub và bản build thành công. Lệnh `node tools/verify-public.cjs` đối chiếu SHA-256 của toàn bộ 70 tệp công khai với `dist/`, kiểm tra cache và các đường dẫn riêng tư trả 404; báo cáo tại `runtime/cloudflare-v082-report.json`.

## Các thay đổi chính

- **0.8:** 395 frame môi trường và 801 frame actors/hiệu ứng; địa hình, nước, đường ghép tile; bảy boss riêng; golem, treant và lốc lớn được bake ở độ phân giải gốc lớn hơn. Props có bốn cấp phá hủy và dấu cháy/hố nứt/sét/băng/tro. Bộ kiểm thử mới kiểm tra lưu trạng thái, cháy lan, vỡ băng, tỉ lệ pixel và chơi trên trình duyệt.

- **0.7:** chuyển động thân/chân/vạt áo theo nhịp chiêu, tư thế tung chiêu AI, vệt lướt và bộ hiệu ứng Blender 56 khung. Phượng lửa, âm vang trúc, lôi thương, mã lệnh cùng bảy nguyên tố có hình ảnh riêng; giảm ánh sáng chồng lên nhân vật. Giữ hình vẽ gốc và hỗ trợ Giảm chuyển động.

- **F tại Chú Bảy** mở cửa hàng: cổ vật 105 xu, đổi bộ hàng từ 30 xu, bình linh lực 35 xu và bùa 60 giây giá 80 xu. Nâng cấp làng giữ qua hành trình mới trên cùng trình duyệt; bình máu và các nâng cấp cũ vẫn mua được.
- Sau khi Q/E/R đều bậc 3, mở bốn nhánh Căn Cốt, Dưỡng Khí, Thân Pháp, Phá Thế; mỗi nhánh tối đa 50 bậc, dùng tổng cộng 600 điểm. Mỗi Q/E/R bậc 3 được chọn một trong hai chuyên hóa miễn phí, giữ trong hành trình đó.
- Hòa Âm Thiên Vũ có hồi nội tại 6 giây và giới hạn khiên; phân thân dùng 62% sát thương bản chính, không tiêu linh lực hay tự nạp tuyệt kỹ. Quân Lê tạo Hắc Giáp tức thì bằng Q; An có thể nhấn E lần hai để hút quái thường và nổ đèn.
- Lướt hủy thu thế; các đòn đã cam kết vẫn nhả đúng một lần. Vùng mới có khoảng 5% quái tinh anh Hỏa/Băng/Lôi, Đài Tế ba đợt trong 30 giây và vùng sương có XP gấp đôi.
- Mỗi nhân vật gắn với một bảo khí riêng; bỏ đổi ô trang bị, băng đạn, nạp đạn, nhặt và nâng vũ khí rơi.
- **K** mở bốn nhánh Q, E, R và nội tại, mỗi nhánh ba bậc. Khởi đầu có ba điểm; lên cấp, nối chương và khám phá môi trường cho thêm điểm.
- **I** mở mô tả nội tại dài, thuộc tính, cổ vật và hành trình. Cổ vật mới có nguồn truyện và cơ chế chiến đấu riêng.
- Giữ hình nhân vật gốc trong các atlas, gồm đủ bảy dạng Thiên Vũ. Nhịp chạy, hướng ngắm, độ nghiêng và chuyển động lấy đà/ra đòn/thu thế được áp dụng lên sprite; hiệu ứng tồn tại được vẽ theo hình tác động.
- Font Noto Sans tiếng Việt được đóng gói tại máy cho DOM và chữ trên canvas; không thay font hệ điều hành.
- Vẫn có đồ họa **Tự động / Chi tiết cao / Nhẹ**, giảm rung/chớp, âm lượng và điều khiển cảm ứng trong Cài đặt.

## Năm lối chơi

| Nhân vật | Nội tại và cách phối hợp | Q / E / R |
| --- | --- | --- |
| An · Tâm Đăng | Đánh địch đang cháy để tích sáu Tàn Lửa; đặt tối đa ba đèn có dây nối, hồi máu khi đứng gần | Quét lửa hình quạt / đặt đèn, nhấn E lại trong 3 giây để nổ / phượng hỏa dọc hướng ngắm |
| Linh · Cung Trúc Hồi Âm | Chạy tích tám Nhịp Trúc, đòn cường hóa xuyên và ghim dấu; Q bắn nối dấu | Giương cung xuyên tuyến / lộn lùi đặt bẫy / thiên tiễn lần lượt săn mục tiêu |
| Quân Lê · Hắc Ấn Đoản Kiếm | Đánh thường phóng nguyệt nhận; linh hồn xác quái/cây đổ tồn tại 20 giây | Hắc Giáp 6,5 giây / triệu hồi bóng thú, tối đa 6 / binh đoàn 14 bóng thú trong 24 giây |
| HoaVi · Ấn Biên Dịch | Tích tám Mã Lệnh, tiêu mã để lặp Q; E có thể nhấn lần hai trong năm giây để trở về điểm lưu | Debug tuyến mã / Checkpoint hồi quy / hai vệ tinh quét tia |
| Thiên Vũ · Thất Linh Tâm Ấn | Ba nguyên tố khác nhau tạo Hòa Âm, hoàn linh lực và khiên; hồi nội tại 6 giây; đổi dạng tạo phản ứng | 21 kỹ năng của bảy dạng; X phân thân 3/5/7, R riêng từng dạng |

Thiên Vũ giữ bảy dạng Lôi, Phong, Thổ, Hỏa, Băng, Mộc, Quang. **C** mở chọn dạng, **1–7** đổi nhanh, **G** chọn tổng số bản thể, **X** tách/hợp. **X** mở trận đồ 3/5/7 trong 4,2 giây, tạo tổng cộng 3/5/7 bản thể gồm bản chính trong 18 giây; nhấn lại để thu hồi. **R** tung tuyệt kỹ riêng của dạng hiện tại sau 0,28 giây, không ép phân thân hay hợp kích. Phân thân cận chiến áp sát, tầm trung chạy vòng, tầm xa thả diều; có HP, vật lý và động tác riêng. Golem tồn tại 18 giây, cây chiến đấu 30 giây; R Băng đóng băng hoàn toàn 2,5 giây, Mộc trói chân 2,5 giây. Chưa có co-op.

R hồi sau 18 giây với HoaVi, An, Linh; 20 giây với Thiên Vũ, Quân Lê, giảm theo bậc kỹ năng và cổ vật. Hồi chiêu tính từ lúc bắt đầu intro. Trong intro, nhân vật miễn sát thương và khống chế, di chuyển còn 35%; địch trong 520 px di chuyển và ra đòn còn 25% tốc độ, bị đẩy nhẹ mỗi 0,8 giây. HUD hiển thị số giây còn lại.

## Thế giới và môi trường

Giữ nguyên làng và vùng gốc 6400 × 4480 cùng nhiệm vụ ba ấn/Cội Đa. Khi đi qua biên cũ, game sinh các miền đất tiếp theo theo seed, cả tọa độ âm; không còn tường biên bản đồ. Rừng, sen, tro, di tích, đồng gió và suối ngọc xuất hiện ở vùng mới.

Chỉ giữ tối đa **25 vùng 1024 px** quanh người chơi. Quái bị hạ hoặc bị thương, rương đã mở, vật thể đã dùng và đạo cụ đã phá được ghi thành thay đổi nhỏ để giữ đúng khi quay lại hoặc tải bản lưu. Đây là thế giới sinh thủ tục không có điểm kết thúc cố định; nội dung từng vùng không được viết tay toàn bộ.

Nhấn **F** ở bếp lửa, quặng, cây nguyện, miếu và thùng nhựa thông. Bếp lửa hồi sức và đặt điểm hồi sinh; quặng/miếu/cây cho cổ vật. Lửa nổ thùng nhựa thông, Thổ phá quặng và đá ở vùng sinh, Mộc đánh thức cây nguyện, Lôi kích hoạt miếu. Cổ vật Thủy Phủ tạo nước phản ứng với Hỏa/Băng/Lôi. Các vật thể có thể dùng và cho thưởng một lần theo trạng thái.

Ở vùng mới, **F tại Đài Tế** bắt đầu thử thách một lượt: ba đợt quái trong tổng 30 giây, rời quá 650 px sẽ thất bại. Thắng rồi nhấn F nhận 120 xu và một cổ vật truyền thuyết còn thiếu, hoặc thêm 80 xu nếu đã đủ. Tiến độ thử thách đang chạy được lưu.

**Sương Mù** hạn chế tầm nhìn; quái trong bán kính 360 px nhận ít hơn 28% sát thương và cho gấp đôi XP khi hạ. F tại Đèn Lạc xua sương một lần, nhận 40 xu. Tinh anh có vòng sáng riêng, đòn nguyên tố và dấu báo trước cho đòn diện rộng.

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
| WASD / mũi tên | Di chuyển; thân quay theo phím, đi chéo ưu tiên hướng ngang; chuột ngắm riêng |
| Chuột / giữ trái | Ngắm / đánh thường, không cần nạp |
| Space | Lướt né |
| Q, E, R | Kỹ năng; R Thiên Vũ lấy đà 0,28 giây, bốn nhân vật khác có intro 4,5 giây |
| F | Tương tác |
| K / I | Học kỹ năng / nhân vật và cổ vật |
| H | Dùng bình máu |
| B | Dùng bình linh lực, hồi 60 MP, mang tối đa 6 bình |
| M / Esc | Bản đồ lân cận / tạm dừng |
| C, 1–7, G, X | Chọn dạng và phân thân của Thiên Vũ |

Trên điện thoại có hai cần và các nút kỹ năng/K/bình linh lực; nút E hiện NỔ hoặc VỀ khi được tái kích. Đã kiểm tra giả lập màn hình ngang/dọc; chưa xác nhận trên điện thoại thật của người dùng.

## Lưu và bản dự phòng

Tự lưu mỗi 12 giây và sau các thao tác quan trọng. Chủ máy dùng `runtime/save.json`; LAN và bản web dùng tiến độ riêng của từng trình duyệt. Bản dự phòng trước 0.6 nằm ở `runtime/backup-before-v06-20261103`. Bản web không chứa save, hồ sơ trình duyệt hoặc cache của chủ máy. Nâng cấp làng được giữ bằng hồ sơ localStorage riêng, không đồng bộ thiết bị; xóa dữ liệu trang sẽ xóa hồ sơ này.

Phân thân giữ dạng, HP và vị trí hợp lệ khi tải lại ở miền xa. Intro R giữ thời gian đã chạy, hướng ngắm và hồi chiêu khi tải lại; chiêu chỉ phát một lần. Các đòn khác đang chờ, trường kỹ năng và checkpoint không được khôi phục qua bản lưu; chết, hồi sinh và dịch chuyển hủy chúng.

## Kiểm tra và đóng gói

```sh
npm test
npm run test:combat
npm run test:elemental-http
npm run test:lan
npm run build:web
```

Máy này có thể dùng `runtime/node.exe` thay `node`. `test:combat` nạp toàn bộ logic 0.7, cho năm nhân vật hoàn thành ba ấn, Cội Đa và sáu chương tiếp nối bằng đòn/kỹ năng thật. Nó rút ngắn di chuyển giữa đấu trường; thời gian mô phỏng không đại diện cho thời lượng chơi hoặc độ khó với người thật.

Xem [thay đổi 0.7](CHANGELOG-v0.7.md), [kiểm chứng và giới hạn](VALIDATION-v0.7.md), [nguồn tham khảo hình ảnh 0.5](ART-v0.5.md). Tài liệu các bản trước được giữ làm lịch sử.

Unity Windows 0.8.3 có cơ chế R và intro tương ứng bản Web. Tải gói Windows tại [GitHub Releases](https://github.com/dodat1306-eng/den-tinh/releases/tag/v0.8.3); xem [hướng dẫn Unity](Unity/README_VI.md). Chiến dịch sáu chương tiếp nối hiện chỉ có ở Web. Tiến độ giữa hai bản lưu riêng.

