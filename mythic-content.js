(function(root){
  'use strict';
  const C=root.DTContent,D=root.DTWorld;
  const relics=[
    ['kimquy','Móng Kim Quy','Việt Nam · An Dương Vương và thần Kim Quy','Một mảnh hộ phù gợi chuyện móng rùa làm lẫy nỏ thần.','Sau khi chịu sát thương, tạo 28 khiên và phản đòn gần nhất. Hồi 12 giây.','shell'],
    ['giong','Đốt Tre Phù Đổng','Việt Nam · Thánh Gióng','Gợi bụi tre được Gióng nhổ lên khi đánh giặc.','Mỗi đòn thường thứ năm mọc hàng tre đâm xuyên phía trước, gây 1,8 lần sát thương.','bamboo'],
    ['thachsan','Dây Đàn Thạch Sanh','Việt Nam · Thạch Sanh','Tiếng đàn trong cổ tích giúp bày tỏ nỗi oan và làm quân sĩ thôi giao chiến.','Dùng E phát tiếng đàn: trói chân quái thường 1,5 giây; boss chậm 0,5 giây. Hồi 10 giây.','lyre'],
    ['chudong','Hạt Sương Chử Đồng Tử','Việt Nam · Chử Đồng Tử','Biến tấu giọt sương trên gậy và nón trong truyền thuyết.','Tương tác một vật thể mới hồi 12 linh lực và 6 máu. Hồi 3 giây.','staff'],
    ['sontinh','Ấn Núi Tản Viên','Việt Nam · Sơn Tinh, Thủy Tinh','Ấn núi là vật phẩm hư cấu gợi phép dâng núi của Sơn Tinh.','Đứng yên 0,8 giây tích Thạch Giáp: giảm 18% đòn kế tiếp và đẩy lùi kẻ đánh. Hồi 6 giây.','mountain'],
    ['thuytinh','Giọt Nước Thủy Phủ','Việt Nam · Sơn Tinh, Thủy Tinh','Giọt thủy phủ là biến tấu sức nước của Thủy Tinh.','Q để lại vũng nước 4 giây, làm chậm địch; sét dẫn qua nước, lửa hóa hơi, băng đóng mặt nước.','water'],
    ['tam','Hài Gấm Tấm','Việt Nam · Tấm Cám','Gợi chiếc hài đưa Tấm đến cuộc gặp trong cổ tích.','Lướt để lại ảnh gấm hấp dẫn quái thường trong 1,8 giây và tăng 20% tốc chạy 2 giây. Hồi 5 giây.','slipper'],
    ['antiem','Hạt Dưa Mai An Tiêm','Việt Nam · Sự tích dưa hấu','Hạt giống gợi hành trình gây dựng cuộc sống trên đảo của Mai An Tiêm.','Hạ tám địch làm nở quả dưa: hồi 18 máu và 12 linh lực.','seed'],
    ['cuoi','Lá Đa Chú Cuội','Việt Nam · Chú Cuội cung trăng','Gợi cây đa và lá thuốc trong truyện Chú Cuội.','Chặn một đòn chí tử, hồi 35% máu và bất tử 2 giây; một lần mỗi hành trình.','leaf'],
    ['traucau','Lá Trầu Nghĩa Tình','Việt Nam · Sự tích trầu cau','Biến tấu sự gắn bó trong chuyện cây cau, lá trầu và đá vôi.','Mỗi lần hồi máu bằng H, nhận 25 khiên và hồi 15 linh lực; không tiêu hao thêm bình.','heart'],
    ['mjolnir','Ấn Búa Mjölnir','Bắc Âu · Thor','Hộ phù lấy cảm hứng từ chiếc búa sấm của Thor.','Đòn thường thứ sáu nối sét qua tối đa ba địch, mỗi địch nhận 90% sát thương; không tự kích hoạt lại.','hammer'],
    ['aegis','Mảnh Khiên Aegis','Hy Lạp · Athena','Gợi tấm aegis bảo hộ gắn với Athena và Zeus.','Q hoặc E cấp 18 khiên nếu đang hết khiên. Hồi 8 giây.','shield'],
    ['hermes','Lông Cánh Hermes','Hy Lạp · Hermes','Gợi đôi dép có cánh của sứ giả Hermes.','Mỗi kỹ năng trúng địch rút 0,35 giây hồi lướt và tăng tốc 12% trong 1 giây, tối đa một lần mỗi 0,8 giây.','wing'],
    ['ariadne','Sợi Chỉ Ariadne','Hy Lạp · Theseus và Ariadne','Sợi chỉ dẫn Theseus trở ra khỏi mê cung.','Nhấn F tại lửa trại lưu điểm nghỉ; lướt ở dưới 30% máu được thêm 0,35 giây miễn thương. Hồi 12 giây.','thread'],
    ['phoenix','Lông Phượng Hoàng','Truyền thuyết phượng hoàng phương Tây','Lấy cảm hứng từ hình tượng phượng hoàng tái sinh; hiệu ứng chiến đấu là hư cấu.','Mỗi tuyệt kỹ hồi 12% máu tối đa và thiêu đốt địch trong 220 bước, không nạp lại lực R.','feather'],
    ['ankh','Nút Sinh Mệnh Ankh','Ai Cập cổ đại · biểu tượng ankh','Ankh là biểu tượng sự sống; nội tại dưới đây được sáng tạo cho game.','Hạ địch đang bị khống chế hồi 4 máu; mỗi địch chỉ kích hoạt một lần.','ankh'],
    ['wukong','Sợi Lông Tề Thiên','Trung Hoa · Tây du ký','Gợi phép biến hóa từ lông của Tôn Ngộ Không trong tiểu thuyết.','Dùng E tạo một phân ảnh bắn ba đòn vào mục tiêu gần nhất, mỗi đòn 65% sát thương. Hồi 9 giây.','clone'],
    ['aladdin','Tàn Đèn Aladdin','Truyện Aladdin · Nghìn lẻ một đêm','Tàn đèn là vật phẩm hư cấu gợi chiếc đèn thần của Aladdin.','Mỗi lần tiêu đủ 90 linh lực được hoàn 25 linh lực và gọi một tia sáng xuyên.','lamp'],
    ['jack','Hạt Đậu Jack','Cổ tích Anh · Jack và cây đậu thần','Gợi hạt đậu mọc thành cây vượt lên mây.','Tương tác môi trường mọc một dây leo trói địch gần đó 2 giây. Hồi 8 giây.','bean'],
    ['cinderella','Mảnh Hài Thủy Tinh','Cổ tích · Cô bé Lọ Lem, bản Charles Perrault','Gợi chiếc hài thủy tinh trong bản truyện của Perrault.','Né một viên đạn khi lướt tích Pha Lê. Ba lần né cường hóa Q kế tiếp: +60% sát thương và hoàn 10 linh lực.','glass']
  ].map((a,i)=>({id:a[0],name:a[1],origin:a[2],lore:a[3],desc:a[4],icon:String(i+1).padStart(2,'0'),motif:a[5],mythic:true,rarity:i===8?'legendary':'epic'}));
  C.relics.push(...relics);
  const passives={
    an:{name:'Đèn Nuôi Hồn',desc:'Đánh thường lên địch đang cháy tích một Tàn Lửa, tối đa sáu. Đủ sáu, Q kế tiếp tiêu thụ toàn bộ, nổ lan các mục tiêu bị đốt và kéo dài các đèn đã đặt. E đặt tối đa ba đèn, nối nhau bằng dây lửa gây sát thương; ở gần đèn hồi máu nhẹ. R giải phóng tất cả đèn thành phượng hỏa dọc đường ngắm. Tàn Lửa mất dần sau sáu giây không đánh trúng.'},
    linh:{name:'Tám Nhịp Trúc',desc:'Chạy đủ 36 bước tích một Nhịp Trúc, tối đa tám; đi càng xa cung càng mạnh. Ở tám nhịp, đòn thường kế tiếp xuyên thêm bốn mục tiêu, ghim chân và đánh dấu địch. Q ưu tiên phá dấu để bắn nối tới địch khác. E lùi người đặt bẫy, R săn các mục tiêu được đánh dấu bằng những mũi tên lần lượt từ trên cao. Bị trúng đòn mất hai nhịp.'},
    quanle:{name:'Chúa Tể Bóng Tối',desc:'Xác quái và cây gãy giữ linh hồn 20 giây. E hồi sinh bóng thú; Q tạo giáp, hút máu và phản đòn; R triệu tập binh đoàn tự tìm địch.'},
    hoavi:{name:'Trình Biên Dịch Sống',desc:'Đánh thường trúng địch tạo Mã Lệnh, tối đa tám. Q đặt lỗi lên mục tiêu rồi truyền dọc đường ngắm; đủ bốn mã sẽ tiêu thụ bốn để biên dịch lại đòn này sau 0,35 giây. E đặt điểm khôi phục trong năm giây; nhấn E lần nữa để trở về, hồi nhẹ và xóa đạn trên đường. R triển khai hai vệ tinh nối tia, tự tìm mục tiêu bị lỗi. Phản ảnh và vệ tinh không tự nạp mã hay tuyệt kỹ.'},
    thienvu:{name:'Thất Linh Giao Thức',desc:'Kỹ năng trúng địch lưu ấn nguyên tố hiện tại. Đổi dạng rồi dùng kỹ năng thuộc một nguyên tố khác tạo phản ứng: Hỏa–Băng hóa hơi, Lôi–Mộc dẫn truyền, Phong gom địch, Thổ nứt giáp, Quang phá ấn. Ba nguyên tố khác nhau trong vòng 12 giây ban Hòa Âm: hoàn 12 linh lực và thêm 10 khiên cơ sở, tăng 3 mỗi bậc nội tại; nghỉ 6 giây giữa hai lần và chỉ cộng khiên đến mốc 60. Cùng một dạng không tự tích Hòa Âm; phân thân hỗ trợ phản ứng với sát thương thấp và không tự nạp R.'}
  };
  Object.assign(C.passives,passives);
  const signature={
    an:{id:'lantern',name:'Tâm Đăng · Đèn Nuôi Hồn',kind:'staff',color:'#ffc777',desc:'Ngọn đèn riêng của An; dẫn lửa và nối đèn trấn.'},
    linh:{id:'bamboo',name:'Cung Trúc Hồi Âm',kind:'bow',color:'#b5f1a1',desc:'Cung riêng của Linh; tích nhịp theo quãng đường chạy.'},
    quanle:{id:'shadow-crescent',name:'Hắc Ảnh Đoản Kiếm',kind:'shadow',color:'#b86bff',desc:'Vung lưỡi trăng khuyết bóng tối xuyên địch, mang cánh hoa hồng đen.'},
    hoavi:{id:'terminal',name:'Ấn Biên Dịch HoaVi',kind:'code',color:'#72f4de',desc:'Bảng mã riêng của HoaVi; biên dịch đòn đánh và lưu điểm trở về.'},
    thienvu:{id:'prism',name:'Thất Linh Tâm Ấn',kind:'elemental',color:'#b4b2ff',desc:'Ấn riêng của Thiên Vũ; biến hình, phản ứng và hợp kích.'}
  };
  const kits={
    an:{q:{name:'Hỏa Liêm Gọi Hồn',desc:'Quét lửa theo hướng ngắm; sáu Tàn Lửa làm địch đang cháy nổ lan.',cost:22,cooldown:4.5},e:{name:'Tam Đăng Kết Giới',desc:'Đặt đèn tại điểm ngắm (tối đa ba), nối dây lửa và hồi máu gần đèn. Nhấn E lần nữa trong 3 giây để giật nổ đèn, kéo nhẹ địch thường.',cost:30,cooldown:6},r:{name:'Phượng Hỏa Quy Đăng',desc:'Phượng hỏa bay dọc hướng ngắm, các đèn đáp lại bằng đường lửa.',cost:0,cooldown:0}},
    linh:{q:{name:'Xuyên Ảnh Truy Phong',desc:'Giương cung rồi xuyên một đường dài; trúng dấu Trúc sẽ bắn nối.',cost:24,cooldown:5},e:{name:'Thoái Bộ Mộc Phục',desc:'Lộn lùi 120 bước và đặt bẫy trúc; bẫy trói và đánh dấu địch.',cost:28,cooldown:7},r:{name:'Thiên Tiễn Truy Danh',desc:'Tung người, sáu mũi thiên tiễn lần lượt săn địch được đánh dấu.',cost:0,cooldown:0}},
    quanle:{q:{name:'Hắc Ảnh Chiến Giáp',desc:'Hắc Giáp 6,5 giây: giảm 35% sát thương, tăng 25% tốc chạy; bốn gai hút máu mỗi 0,4 giây và phản đòn khi bị đánh.',cost:28,cooldown:9},e:{name:'Hắc Ảnh Triệu Hồi',desc:'Hồi sinh linh hồn gần trong 260 bước hoặc mở cổng gọi ngẫu nhiên một trong 22 bóng thú. Tối đa sáu con trong 22 giây.',cost:32,cooldown:7},r:{name:'Bách Quỷ Dạ Hành',desc:'Thu toàn bộ linh hồn trong 420 bước, gọi 10–14 bóng thú và cường hóa đội quân 24 giây. Linh hồn vượt sức chứa tăng sức mạnh binh đoàn.',cost:0,cooldown:0}},
    hoavi:{q:{name:'Debug · Điểm Gãy',desc:'Tia mã đặt lỗi lên địch; bốn Mã Lệnh cho phép lặp lại sau 0,35 giây.',cost:24,cooldown:5},e:{name:'Checkpoint · Hồi Quy',desc:'Đặt neo năm giây. Nhấn E lần nữa để quay về và xóa đạn dọc đường.',cost:32,cooldown:10},r:{name:'Overclock · Song Tinh',desc:'Hai vệ tinh tìm địch bị lỗi, nối thành tia quét trong tám giây.',cost:0,cooldown:0}},
    thienvu:{}
  };
  for(const id of Object.keys(kits))if(id!=='thienvu')Object.assign(D.HEROES[id],{q:kits[id].q.name,e:kits[id].e.name,r:kits[id].r.name,desc:passives[id].name+' · '+signature[id].desc});
  const nodeNames={an:['Dẫn Hồn','Đăng Mạch','Phượng Vũ','Nuôi Tàn Lửa'],linh:['Truy Phong','Mộc Phục','Thiên Tiễn','Nhịp Trúc'],quanle:['Hắc Giáp','Arise · Bóng Thú','Bách Quỷ','Linh Hồn Bóng Tối'],hoavi:['Biên Dịch','Checkpoint','Song Tinh','Tối Ưu Mã'],thienvu:['Linh Thuật','Hộ Linh','Thiên Tượng','Hòa Âm']};
  C.version='0.5.0';C.kits=kits;C.signatures=signature;C.mythicRelics=relics;
  root.DTMythic={relics,signature,kits,passives,nodeNames};
})(globalThis);
