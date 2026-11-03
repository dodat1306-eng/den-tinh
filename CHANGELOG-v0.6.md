# Đèn Tinh 0.6 — gameplay và khám phá

## Kinh tế và phát triển

F tại Chú Bảy mở cửa hàng. Ba ô cổ vật giá 105 xu/ô, bộ hàng và ô đã mua được lưu; mở lại hoặc tải game không đổi hàng miễn phí. Đổi hàng tốn 30 xu, tăng 15 xu mỗi lần, trần 180 xu. Bình linh lực giá 35 xu, hồi 60 MP bằng B, mang tối đa sáu bình. Bùa giá 80 xu có hiệu lực 60 giây chơi thực, tăng 12% tốc độ chạy và giảm 10% hồi Q/E mới dùng; thời gian dừng khi tạm dừng, không cộng dồn.

Nâng cấp làng có hai nhánh, mỗi nhánh năm bậc, giá 150/250/350/450/550 xu. Sức Sống thêm 5% HP cơ sở mỗi bậc, làm tròn lên. Tiếp Tế thêm một bình máu khi bắt đầu hoặc nâng mức tối thiểu khi hồi sinh. Giữ qua hành trình mới trên cùng trình duyệt bằng localStorage; tải lại không cấp lại bình đã dùng. Không đồng bộ tài khoản/thiết bị. Các món nâng chỉ số và bình máu cũ vẫn dùng được.

K mở bốn nhánh sau khi Q/E/R đều đạt bậc 3: Căn Cốt thêm 2% HP cơ sở/bậc (làm tròn lên); Dưỡng Khí thêm 5% hồi MP cơ sở; Thân Pháp thêm 3% vận tốc lướt; Phá Thế thêm 0,02 hệ số chí mạng. Mỗi nhánh 50 bậc, chi phí 1–5 điểm/bậc, tăng mỗi mười bậc: tổng 600 điểm cho cả bốn nhánh. Thân Pháp không kéo dài miễn thương.

Mỗi Q/E/R bậc 3 chọn miễn phí một chuyên hóa cho hành trình đó:

| Chiêu | Lựa chọn 1 | Lựa chọn 2 |
| --- | --- | --- |
| Q | Tập Trung: +25% sát thương chính; Linh xuyên tối đa 10 mục tiêu | Bộc Phát: −15% sát thương chính và nổ vùng; Linh dùng tên găm nổ |
| E | Bền Vững: trường mới tồn tại lâu hơn 40%, thêm 15 khiên | Ứng Biến: hồi E nhanh hơn 25%, +15% chạy trong 2 giây |
| R | Uy Lực: +25% sát thương | Tái Sinh: −15% sát thương, hồi 18% HP tối đa và 20 MP khi nhả chiêu |

## Chiến đấu

Thiên Vũ: Hòa Âm có hồi nội tại 6 giây; hồi 12 + 3 × bậc nội tại MP và 10 + 3 × bậc nội tại khiên, giới hạn khiên do Hòa Âm ở 60. Không làm mất phần khiên trên 60 đang có từ nguồn khác. Giảm 30% sức mạnh đòn thường và kỹ năng của phân thân; phân thân không tự kích Hòa Âm/nạp tuyệt kỹ.

Kiệt: Q cho 0,28 giây miễn sát thương lúc cam kết lao, ghìm quái thường ở gần trong 0,25 giây khi ra đòn. An: E tái kích sau khi đèn đã nhả, trong ba giây, hút quái thường tối đa 80 px về tâm và nổ từng đèn trong bán kính 165 px; boss kháng kéo. Không tốn thêm MP hay đặt lại hồi chiêu; tiêu đèn để tránh nổ nhiều lần.

Lướt hủy thu thế. Khi đang lấy đà, lướt giữ đúng một lần nhả đã cam kết rồi cắt phần thu thế; các đòn nối đã nhả vẫn tiếp tục, không hoàn lại MP/năng lượng. Giữ cửa sổ miễn thương hiện có của lướt, không cộng dồn thêm. Nút E cảm ứng phản ánh khả năng nổ đèn của An hoặc về checkpoint HoaVi ngay trong hồi chiêu.

## Vùng sinh liên tục

Khoảng 5% quái được sinh ở vùng mới là tinh anh Hỏa/Băng/Lôi theo seed; đây là tỷ lệ kỳ vọng trên nhiều quái, không bảo đảm mỗi vùng có một tinh anh. Tinh anh có HP ×1,65, sát thương ×1,2, XP/xu ×2, vòng sáng và chiêu nguyên tố: vùng cháy, đạn băng làm chậm khi gây sát thương, sét có dấu báo.

Các vùng đủ điều kiện có thể sinh Đài Tế hoặc Đèn Lạc. Đài Tế gồm ba đợt, mỗi đợt ba quái, tổng 30 giây. Một lần thử; hết giờ hoặc rời quá 650 px sẽ thất bại và dọn quái triệu hồi. Thắng nhấn F nhận 120 xu cùng cổ vật truyền thuyết chưa có, hoặc 80 xu thay thế nếu đã đủ. Lưu đợt/thời gian/HP quái, không nhân đôi phần thưởng khi tải lại.

Sương giảm tầm nhìn; quái trong bán kính 360 px nhận ít hơn 28% sát thương, cho XP gấp đôi. F tại Đèn Lạc xua sương và nhận 40 xu một lần. Giữ thay đổi khi vùng bị dỡ rồi nạp lại.

Giữ atlas nhân vật và môi trường hiện có; bổ sung vòng nguyên tố, dấu báo đòn, đài tế/đèn và lớp sương bằng Canvas. Không thêm tài nguyên hình ảnh tải từ mạng. Nâng cấp này áp dụng cho bản trình duyệt; dự án Unity giữ nội dung trước đó.
