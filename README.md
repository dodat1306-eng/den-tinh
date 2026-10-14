# Đèn Tinh: Miền Sương Lạc

Bản chơi đầu tiên 0.1, game hành động 2D nhìn từ trên xuống, một người chơi, tiếng Việt. Một thế giới mở nhỏ gồm các vùng nối liền, có cốt truyện, khám phá tự do và trận kết thúc.

## Chạy từ source trên GitHub

1. Clone repo hoặc chọn **Code → Download ZIP**, rồi giải nén vào thư mục bạn muốn, ví dụ một thư mục trên ổ D hoặc E.
2. Có [Node.js](https://nodejs.org/) phiên bản 22 trở lên. Source không dùng thư viện npm bên ngoài, nên không cần `npm install`.
3. Trên Windows, nhấp đúp **CHOI_GAME.bat**. Bộ khởi chạy tìm `runtime\node.exe` nếu có, hoặc dùng Node.js đã cài trên máy.

Trên các hệ điều hành khác, chạy từ thư mục repo:

```sh
npm start
```

Sau đó mở **http://127.0.0.1:4174/** trong trình duyệt. Máy chủ chỉ lắng nghe trên máy của bạn. Bản lưu chính được tạo trong `runtime/save.json`.

Kiểm tra source:

```sh
npm test
npm run test:combat
```

`npm run test:http` kiểm tra máy chủ đang chạy ở cổng 4174. Các báo cáo được tạo vào `qa/`.

Repo chứa mã nguồn, bộ khởi chạy, công cụ kiểm tra và giấy phép của runtime Node. Runtime thực thi, bản lưu, cache, hồ sơ trình duyệt và báo cáo cục bộ được loại khỏi Git bằng `.gitignore`.

## Chơi ngay

1. Mở thư mục `E:\Games\DenTinh`.
2. Nhấp đúp **CHOI_GAME.bat**.
3. Chọn An, Linh hoặc Kiệt, rồi chọn **Bắt đầu hành trình**.

Game chạy offline bằng Microsoft Edge hoặc Chrome đã có trên máy. Bộ khởi chạy tự mở một máy chủ nhỏ tại `http://127.0.0.1:4174`, chỉ nhận kết nối trên máy của bạn. Không cần cài engine, đăng nhập hay trả phí. Runtime Node có sẵn được sao chép vào `runtime\node.exe` trên E để không cần cài thêm.

Dự án, runtime, dữ liệu trình duyệt riêng của game và bộ nhớ đệm đều đặt dưới `E:\Games\DenTinh`. Bộ khởi chạy sử dụng trình duyệt đang có trên máy. Không thay đổi hồ sơ trình duyệt cá nhân. Đóng cửa sổ là thoát game; máy chủ nội bộ nhẹ vẫn ở nền để lần sau mở nhanh, và dừng khi khởi động lại Windows. Không cần kết nối Internet khi chơi.

## Điều khiển

| Phím | Hành động |
| --- | --- |
| WASD / phím mũi tên | Di chuyển |
| Chuột | Ngắm |
| Giữ chuột trái | Tấn công |
| Space | Lướt né; có một khoảng miễn sát thương |
| Q, E | Kỹ năng riêng, dùng linh lực tự hồi |
| R | Tuyệt kỹ khi tích đủ lực bằng cách đánh quái |
| F | Nói chuyện, dùng giếng, mở rương, thức tỉnh ấn |
| H | Uống bình máu |
| M | Bản đồ toàn vùng |
| I | Thuộc tính và mô tả kỹ năng |
| Esc | Tạm dừng, lưu hoặc về màn đầu |

## Hành trình

Sương đã nuốt tên của Làng Đèn. Bà Năm trao cho người giữ lửa một ngọn đèn vẫn nhớ đường về. Linh thú Đốm đi cùng người chơi.

Khám phá Rừng Trúc, Đầm Sen và Đồi Tro theo bất kỳ thứ tự nào. Hạ bảy hộ vệ quanh mỗi ấn rồi nhấn F cạnh ấn để thức tỉnh. Mỗi ấn hồi sức, thưởng xu và giúp tích lực tuyệt kỹ. Ấn đã thức tỉnh có thể đưa người chơi về làng.

Khi đủ ba ấn, đến Cội Đa Lạc Hồn ở phía bắc và nhấn F tại đàn tế. Boss có vòng đạn, loạt đạn ngắm, rễ báo trước dưới chân và quái triệu hồi; thay nhịp ở nửa máu. Sau trận thắng, vẫn có thể khám phá và trở về Bà Năm để đọc đoạn kết.

Giếng Ngọc hồi đầy máu, linh lực và bổ sung ít nhất ba bình máu. Chú Bảy bán bình máu và nâng sát thương hoặc máu tối đa bằng xu nhặt từ quái, rương và ấn. Lên cấp được chọn một trong ba phần thưởng.

## Ba nhân vật

| Nhân vật | Đòn đánh | Q | E | R |
| --- | --- | --- | --- | --- |
| An — Người Giữ Đèn | Tia lửa linh | Liên Hỏa: chín tia hình quạt | Vòng Trấn: lửa diện rộng, hồi một phần máu | Thiên Đăng: bùng lửa và đạn tỏa tròn |
| Linh — Trúc Ảnh | Cung ngọc nhanh | Xuyên Vân: ba mũi tên xuyên mục tiêu | Mưa Trúc: vùng sát thương tại hướng chuột | Phong Linh: bão lá theo người |
| Kiệt — Lôi Vệ | Lôi thương ba tia | Lôi Liên: sét nối các mục tiêu | Chấn Địa: hất quái, xóa đạn gần người | Thiên Lôi: sấm diện rộng |

Tuyệt kỹ của mọi nhân vật còn xóa đạn gần người, hồi một phần máu và cho một nhịp miễn sát thương. Tuyệt kỹ không tự nạp lại từ sát thương của chính nó.

## Lưu game

Tự lưu mỗi 12 giây và sau những tương tác quan trọng. Trong Esc có **Lưu tiến độ** và **Lưu và về màn đầu**. Chọn **Tiếp tục** để khôi phục nhân vật, cấp độ, thuộc tính, xu, bình máu, quái đã hạ, rương đã mở và ấn đã thức tỉnh.

Bản lưu chính là `runtime\save.json`, nằm trên E. Game còn giữ bản dự phòng trong hồ sơ trình duyệt riêng tại `runtime\browser-profile`. Chơi trong Codex và qua bộ khởi chạy có thể dùng cùng bản lưu chính. Sao lưu `runtime\save.json` nếu muốn giữ hành trình. Bản ZIP phát hành không chứa hồ sơ hoặc tiến độ của người chơi.

## Tệp nguồn và kiểm tra

| Tệp | Nội dung |
| --- | --- |
| `world.js` | Bản đồ, cảnh vật, vị trí quái, rương, nhân vật phụ và ấn |
| `engine.js` | Chiến đấu, di chuyển, kỹ năng, nhiệm vụ, nâng cấp và lưu game |
| `render.js` | Nhân vật, cảnh vật pixel, bản đồ và hiệu ứng bằng Canvas |
| `app.js` | Điều khiển, giao diện, hội thoại và âm thanh tổng hợp |
| `style.css`, `index.html` | Bố cục và màn hình game |
| `Start-Game.ps1`, `CHOI_GAME.bat` | Mở cửa sổ game và đặt hồ sơ/cache trong thư mục dự án |
| `tools/test.cjs` | Kiểm tra đường đi, va chạm, kỹ năng, nhiệm vụ, lưu và hồi sinh |
| `tools/playthrough.cjs` | Mô phỏng chiến đấu với cả ba nhân vật |
| `qa/` | Báo cáo tạo khi chạy kiểm tra; không đưa lên Git |

Dành cho sửa tiếp: `node tools/test.cjs` và `node tools/playthrough.cjs`. Bộ mô phỏng tự điều khiển chiến đấu; di chuyển giữa các đấu trường được rút ngắn, vì thế thời gian trong báo cáo không phải thời lượng chơi thực tế. Bản đồ được kiểm tra đường đi riêng bằng tìm kiếm lưới.

Không có tài nguyên tải từ CDN hay dịch vụ game bên ngoài. Hình nhân vật, cảnh vật, hiệu ứng và âm thanh được xây riêng bằng mã nguồn. Đây là bản đầu với một bản đồ hữu hạn, chưa có nhiều người chơi, dungeon ngẫu nhiên, trang bị nhiều loại hay điều khiển điện thoại.

## Nguồn cảm hứng đã tham khảo

- [Soul Knight — trang chính thức của ChillyRoom](https://soulknight.chillyroom.com/et): tham khảo theo yêu cầu về một game hành động góc nhìn từ trên xuống. Nhân vật, cốt truyện và hình ảnh của Đèn Tinh được thiết kế riêng.
- [Vietnam Tourism — những làng nghề lụa truyền thống](https://vietnam.travel/node/1669): tham khảo chất liệu làng cổ như cây đa, giếng nước và đình làng. Thế giới và linh thú trong game là hư cấu.

