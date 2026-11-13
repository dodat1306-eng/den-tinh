# Thiên Vũ · Bảy nguyên tố / NPC chiến đấu

Nguồn `thienvu-pixel-v08.blend`: rig 13 xương, bảy bộ trang bị riêng, tám động tác × bốn hướng × bảy dạng, tổng 980 frame 64×64. Kiếm Sét, Quạt Chiến, Đôi Găng Đá, Búa Băng, Vòng Cưa Lửa, Roi Dây Gai và Vòng Sáng/Mắt Sáng gắn xương. Bone vòng sáng xoay riêng trong bước bake dạng Ánh Sáng. Anchor bàn chân `(32,58)`; bản chính hiển thị 128px, NPC 96px.

Nguồn `thienvu-combat-mesh.blend` thêm 25 clip / 134 frame mesh Blender: ma trận hai vòng, bảy huy hiệu, golem, treant, núi đá, lồng băng, phun lửa, thiên thạch, ván gió, lốc xoáy, dây leo, kiếm trận, tia/lăng kính mặt trời. Cộng 75 clip gốc thành 100 clip / 459 frame. Shader normal qua ColorRamp CONSTANT bốn bậc rồi emission; camera ORTHO, nền trong suốt, filter 0.01, Standard. Pillow nearest, palette theo nguyên tố, alpha nhị phân và viền 1px; không dùng bloom/blur.

Web dùng `assets/thienvu-pixel-v08.*` và `assets/thienvu-vfx-pixel.*`. Công cụ export sao chép nguyên PNG sang Unity, xuất 324 clip phẳng cho JsonUtility. Thân theo hướng di chuyển, ngắm riêng; NPC có vật lý, mục tiêu, hoạt ảnh và hồi chiêu đánh/Q/E/R riêng. Nhấn R mở chọn 3/5/7; giữ 0,45 giây tách bảy. Tuyệt kỹ/hợp kích giữ nút riêng. Golem 18 giây, treant 30 giây, freeze 2 giây, root 2,5 giây.

## Tạo lại

Chạy từ gốc repo với Python có Pillow/NumPy:

```powershell
& 'E:\Tools\Blender\5.2.3\blender.exe' --background --python design/blender/thienvu/build_thienvu_pixel.py
python design/blender/thienvu/build_thienvu_vfx_pixel.py
& 'E:\Tools\Blender\5.2.3\blender.exe' --background --python design/blender/thienvu/build_thienvu_combat_mesh.py -- --build
python design/blender/thienvu/build_thienvu_combat_mesh.py
& 'E:\Tools\Blender\5.2.3\blender.exe' --background --python design/blender/thienvu/bake_thienvu_pixel.py -- --worker --forms lightning,wind,earth,fire,ice,nature,light
python design/blender/thienvu/bake_thienvu_pixel.py
& 'E:\Tools\Blender\5.2.3\blender.exe' --background --python design/blender/thienvu/qa_thienvu_combat.py
node tools/export-unity-content.cjs
python design/blender/thienvu/verify_thienvu_pixel.py
npm test
npm run test:thienvu-pixel
node tools/elemental-npc-browser.cjs
npm run test:browser-motion
python design/blender/thienvu/bake_thienvu_pixel.py --review
powershell -NoProfile -ExecutionPolicy Bypass -File tools/Test-Unity-Core.ps1
npm run build:web
```

Phải tạo lại VFX gốc trước khi pack mesh để tránh cộng hàng atlas nhiều lần. Worker nhân vật có thể chia `--forms` thành nhóm không trùng nhau; pack sau khi mọi worker kết thúc.

## Kiểm chứng và giới hạn

- `pixel-assets-verified.json`: 980 frame, bảy silhouette, alpha 0/255, đúng palette, viền 1px, không cắt biên; tay di chuyển tối thiểu 8,94px.
- `qa-combat-geometry.json`: 32 nhóm đạt, không lỗi topology, trọng số hoặc z-fighting; ngưỡng z-fighting 0,2mm, dung sai tiếp xúc 25mm. Kiểm riêng các vật thể ma thuật cố ý bay; kiểm chồng mặt trên cả nhóm. Không kiểm UV vì chỉ bake vật liệu sang PNG, không xuất mesh game.
- 31 cảnh báo được giữ có chủ đích: 23 cảnh báo độ cao mặt đất của VFX/đế chân; tám cảnh báo mặt kín/back-to-back do thân dùng chung ở bảy dạng (hai cặp) và trang bị Đất (bốn cặp). Các mặt kín không xuất sang runtime; ảnh random/wire kiểm tra mối nối và hình khối.
- `pixel-browser-verified.json`: DPR 1/2, mọi động tác/hướng, raster cache tối đa 64 / 8MiB, đổi dạng, Q/E, năm/bảy bản thể và hợp kích. Chế độ Nhẹ/Giảm chuyển động giữ atlas.
- `npc-browser-verified.json`: R nhấn/giữ, focus/Escape, cảm ứng R khi 0% tuyệt kỹ, NPC và ít nhất bốn summon được gọi vẽ, 25 clip mesh đúng alpha/palette, không lỗi JavaScript.
- `thienvu-boboiboy-7elements-preview.png`: bảy vũ khí, bảy huy hiệu, triệu hồi/VFX và ảnh game sạch. Ảnh combat dùng cảnh dựng sẵn để tái lập; chưa kiểm tra điện thoại vật lý. Video chuyển động nằm trong `runtime/qa-v07-motion/`.

Lõi Unity biên dịch và vượt bài kiểm tra C# riêng. Unity Editor chưa cài, chưa kiểm tra runtime/GUI/cảm ứng Unity hoặc xuất bản Unity. Tia raster Web giới hạn 2048 đơn vị; cần chia đoạn nếu sau này có kỹ năng dài hơn.
