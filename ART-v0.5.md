# Đèn Tinh 0.5 — chất liệu tham khảo và tài nguyên

## Nguyên tắc hiệu ứng

Đã tham khảo bài [Clarity in League của Riot Games](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/): ưu tiên vùng tác động dễ đọc và thứ bậc hình ảnh. Áp dụng vào đường báo đòn, hình vuông Tứ Trụ Thiên Lao, tường phản đạn, đường nối đèn và mức sáng của các hiệu ứng hỗ trợ. Không sao chép sprite, nhân vật hoặc tài nguyên của Riot.

Động tác được dựng tại máy bằng canvas: các khớp tay/chân, hướng ngắm, thế lấy đà/ra đòn/thu thế, độ nghiêng thân, dây cung, thương và bảo khí. Sáu boss và các trường kỹ năng mới dùng hình học riêng. Giữ các atlas/key art sẵn có của dự án; đợt 0.5 không tải tài nguyên thương mại của game khác.

## Font

Đóng gói `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf` từ [kho Noto Fonts](https://github.com/notofonts/noto-fonts), thư mục `hinted/ttf/NotoSans`. Giấy phép SIL Open Font License 1.1 đi kèm trong `assets/fonts/OFL.txt`. Giao diện dùng tên họ font `DenTinh Sans`; không cài hoặc đổi font của Windows.

## Chất liệu cổ vật

Mô tả nguồn truyện tách khỏi hiệu ứng gameplay trong danh mục I → Cổ vật. Các tên như Ấn Núi Tản Viên, Giọt Nước Thủy Phủ, Hạt Sương Chử Đồng Tử và Tàn Đèn Aladdin là cách đặt tên hư cấu của game, không được trình bày như cổ vật lịch sử.

Một số nguồn đã đối chiếu:

- [Thạch Sanh — Ủy ban Nhà nước về người Việt Nam ở nước ngoài](https://scov.gov.vn/que-huong/goc-thieu-nhi/thach-sanh.html): tiếng đàn và tình tiết cổ tích làm chất liệu cho Dây Đàn Thạch Sanh.
- [Athena và aegis — The Metropolitan Museum of Art](https://www.metmuseum.org/art/collection/search/255936): lớp bảo hộ gắn với Athena/Zeus.
- [Hermes — Fitzwilliam Museum](https://fitzmuseum.cam.ac.uk/explore-our-collection/highlights/context/subjects/mercuryhermes): dép/cánh của sứ giả làm chất liệu cho nội tại tốc độ.
- [Bảo tàng Quốc gia Đan Mạch: bùa búa Thor](https://natmus.dk/nyhed/runer-bekraefter-thors-hammer-er-en-hammer/): biểu tượng búa sấm cho Ấn Búa Mjölnir.
- [Biểu tượng Ai Cập — British Museum](https://www.britishmuseum.org/sites/default/files/2025-05/Ancient-Egypt-Symbols-Visit-Resource-Ages-7-11.pdf): ankh là biểu tượng sự sống.

Các truyền thuyết có nhiều dị bản. Lá Đa Chú Cuội, Hạt Dưa Mai An Tiêm, lá trầu/cau, Kim Quy, bụi tre Gióng, sợi chỉ Ariadne, phượng hoàng, Tây du ký, Aladdin, Jack và Lọ Lem được diễn giải thành nội tại mới. Không dùng lời văn dài hay hình minh họa từ các trang tham khảo. Hiệu ứng hồi sinh, đóng băng, giáp, tích mã, hoàn linh lực và sát thương đều là sáng tác gameplay.

## Phối hợp AI

Đợt đầu được giao qua 9Router theo yêu cầu có hiệu lực lúc đó: một model của mỗi nhà cung cấp đang kết nối. Gemini và Antigravity cung cấp bản nháp; các chi tiết gán nhầm nhân vật/truyền thuyết và mã không phù hợp đã bị loại hoặc chỉnh lại. Codex qua router hết thời gian; GitHub trả lời thiếu nội dung dùng được. Phần còn thiếu được triển khai và kiểm tra tại máy. Các bản nháp không được dùng làm bằng chứng kiểm thử.

Sau khi người dùng đổi quy tắc sang chọn một helper hoặc tối đa hai cho việc phức tạp, không thực hiện thêm đợt gọi toàn bộ nhà cung cấp.
