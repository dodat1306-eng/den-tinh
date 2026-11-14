(function(root){
  'use strict';
  const hero={id:'hoavi',name:'HoaVi',role:'KIẾN TRÚC SƯ MÃ LỆNH',desc:'Tích Mã Lệnh, dựng tường lửa và bùng nổ Overclock.',color:'#74f4e3',cloth:'#69528c',accent:'#f29bd2',hp:110,speed:242,damage:16,fireRate:.2,shotSpeed:740,q:'Debug Pulse',e:'Firewall',r:'Overclock',qCd:5,eCd:10,rCd:18};
  root.DTWorld.HEROES.hoavi=hero;
  const weapons=[
    ['lantern','Đèn Lưu Hỏa','staff','common',1,.24,1,0,650,12,1.2,'#ffc777','burn','Tia lửa để lại cháy âm ỉ.'],
    ['bamboo','Cung Trúc Ảnh','bow','common',.95,.19,1,1,900,16,1.1,'#b5f1a1','pierce','Xuyên một mục tiêu.'],
    ['thunder','Ấn Lôi Quang','orb','common',.75,.34,3,0,620,15,1.35,'#b6c7ff','shock','Ba tia điện tỏa hình quạt.'],
    ['terminal','Terminal 01','code','common',1,.21,1,0,790,18,1.15,'#72f4de','code','Đạn mã lệnh cộng dồn nội tại HoaVi.'],
    ['lotus','Liên Hoa Tán','fan','rare',.65,.46,5,0,550,20,1.6,'#ff9dce','heal','Hạ quái có cơ hội hồi máu.'],
    ['ember','Hỏa Pháo Tro Tàn','shotgun','rare',.88,.65,7,0,560,21,1.8,'#ff9366','burn','Tầm gần bùng nổ, gây thiêu đốt.'],
    ['jade','Ngọc Xuyên Sơn','bow','rare',1.5,.35,1,4,1100,10,1.35,'#9cf2b6','pierce','Mũi tên xuyên cả hàng quái.'],
    ['compiler','Compiler X','code','epic',.7,.16,2,1,850,24,1.4,'#79e6ff','code','Hai luồng mã xuyên mục tiêu.'],
    ['storm','Phong Lôi Cầm','staff','epic',1.1,.28,2,0,720,20,1.6,'#c4b5ff','chain','Sét lan tới hai quái gần mục tiêu.'],
    ['lotusblade','Sen Nguyệt Kiếm','blade','rare',2,.42,1,3,980,10,.95,'#f9c2d8','heal','Sóng kiếm hình trăng lưỡi liềm.'],
    ['firewall','Firewall.exe','code','epic',1.3,.32,1,2,780,18,1.4,'#f5a4ef','explode','Gói dữ liệu nổ khi chạm mục tiêu.'],
    ['banyan','Rễ Ký Ức','staff','legendary',1.5,.3,3,2,720,30,1.8,'#ffe1a2','chain','Ba rễ linh lan điện, xuyên mục tiêu.']
  ].map(a=>({id:a[0],name:a[1],kind:a[2],rarity:a[3],power:a[4],interval:a[5],shots:a[6],pierce:a[7],speed:a[8],clip:a[9],reload:a[10],color:a[11],effect:a[12],desc:a[13]}));
  const relics=[
    ['power','Tâm Hỏa','✦','+5 sát thương cho mọi đòn đánh.'],
    ['vitality','Bền Rễ','◈','+30 máu tối đa, hồi 45 máu và thêm 4% giáp.'],
    ['haste','Gió Trúc','↝','Tăng tốc đánh 13% và tốc di chuyển.'],
    ['spirit','Tâm Ngọc','◇','+20 linh lực tối đa và 5% chí mạng.'],
    ['wildfire','Lửa Truyền','♨','Đòn đánh gây cháy; quái đang cháy lan lửa khi bị hạ.'],
    ['dashshock','Dấu Chân Sấm','ϟ','Lướt để lại tia sét gây sát thương quanh điểm xuất phát.'],
    ['split','Nhánh Trúc','⋔','Thêm một đạn, mỗi viên giữ 85% sát thương.'],
    ['pierce','Xuyên Mây','➶','Mọi đạn xuyên thêm hai mục tiêu.'],
    ['vampire','Sương Sen','❀','Hạ quái hồi 3 máu; ấn Sen hồi phục mạnh hơn.'],
    ['chain','Mạch Lôi','⌁','Đòn đánh có 25% cơ hội lan sét tới hai quái.'],
    ['cooling','Tản Nhiệt','❄','Q và E hồi nhanh hơn 20%; nạp vũ khí nhanh hơn.'],
    ['dom','Lời Hứa Của Đốm','✧','Đốm nhặt vật phẩm từ xa, chỉ rương bí mật và hồi 1 máu mỗi giây.']
  ].map(a=>({id:a[0],name:a[1],icon:a[2],desc:a[3]}));
  const passives={
    an:{name:'Ngọn Lửa Bền Bỉ',desc:'Đòn lửa đốt thêm sát thương; thức tỉnh một ấn hồi đầy máu.'},
    linh:{name:'Nhịp Lá',desc:'Di chuyển liên tục tăng 12% tốc đánh; cung có khả năng xuyên.'},
    quanle:{name:'Chúa Tể Bóng Tối',desc:'Xác quái và cây gãy hóa linh hồn; dùng E gọi bóng thú, Q khoác Hắc Giáp, R tập hợp binh đoàn.'},
    hoavi:{name:'Mã Lệnh',desc:'Mỗi lần đánh trúng tích một Mã Lệnh (tối đa 8). Q tiêu thụ mã để tăng sát thương và rút hồi chiêu; E dựng Firewall, hồi máu và cấp khiên. R Overclock tăng tốc bắn và triển khai drone.'}
  };
  const lore=[
    {id:'bell',x:430,y:1950,title:'Tiếng chuông bị giấu',text:'Chuông đình không mất tiếng. Nó đang đợi một người còn nhớ tên làng.',reward:'wildfire'},
    {id:'letter',x:1220,y:470,title:'Lá thư trong ống trúc',text:'Linh từng gửi một lời hẹn vào gió. Đốm vẫn nhận ra mùi mực cũ.',reward:'pierce'},
    {id:'lotus-memory',x:3430,y:2420,title:'Người giữ đầm',text:'Một đốm sáng dưới lá sen nhắc HoaVi rằng ký ức cũng có thể được sao lưu.',reward:'vampire'}
  ];
  root.DTContent={version:'0.2.0',weapons,relics,passives,lore,weapon:id=>weapons.find(w=>w.id===id)||weapons[0],relic:id=>relics.find(r=>r.id===id),rarity:{common:'THƯỜNG',rare:'HIẾM',epic:'SỬ THI',legendary:'HUYỀN THOẠI'}};
})(globalThis);
