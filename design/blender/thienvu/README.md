# Thiên Vũ · Thất Linh Sứ pixel

Nguồn Blender `thienvu-pixel-v08.blend`: rig `THIENVU_Armature` 13 xương, bảy collection trang bị riêng. Tóc bạc nhọn, găng nguyên tố lớn; Thổ dùng hai găng đá. Tám động tác × bốn hướng × bảy dạng tạo 980 frame 64×64, anchor `(32,58)`. Bản thể chính hiển thị 128px, phân thân 96px.

`assets/thienvu-pixel-v08.*` chứa nhân vật; `assets/thienvu-vfx-pixel.*` chứa 75 clip / 325 frame hiệu ứng. Runtime `thienvu-pixel.js` dùng atlas, nearest, tọa độ nguyên, alpha 0/255 và palette từng hệ. Bóng đổi dạng kết thúc sau 0,32 giây; hợp kích nối đủ bảy tia tới điểm ngắm thật. Gameplay và dữ liệu lưu giữ nguyên.

## Tạo lại

Chạy từ thư mục gốc repo, dùng Python có Pillow/NumPy. `python` bên dưới tương ứng runtime đã cài; Blender tại máy là `E:\Tools\Blender\5.2.3\blender.exe`.

```powershell
& 'E:\Tools\Blender\5.2.3\blender.exe' --background --python design/blender/thienvu/build_thienvu_pixel.py
python design/blender/thienvu/build_thienvu_vfx_pixel.py
& 'E:\Tools\Blender\5.2.3\blender.exe' --background --python design/blender/thienvu/bake_thienvu_pixel.py -- --worker --forms lightning,wind,earth,fire,ice,nature,light
python design/blender/thienvu/bake_thienvu_pixel.py
npm run test:thienvu-pixel
python design/blender/thienvu/verify_thienvu_pixel.py
npm test
npm run test:elemental-http
npm run test:browser-motion
npm run build:web
```

## Kiểm chứng

- `pixel-assets-verified.json`: 980 frame không cắt biên, viền 1px `#100b18`, đúng palette/alpha; bảy silhouette riêng; tay di chuyển tối thiểu 8,94px. Chiều cao idle 49–50px.
- `qa-pixel-geometry.json`: 76 lần kiểm tra hình học đạt, không lỗi. 69 cảnh báo khoảng cách mặt đất thuộc phụ kiện cố ý bay, kiểm riêng khỏi thân nhân vật. Không kiểm UV: mesh dùng vật liệu emission để bake PNG, không xuất mesh vào game.
- `pixel-browser-verified.json`: DPR 1/2, đủ động tác/hướng, cache giới hạn 64 raster / 8MiB, đổi dạng, Q/E, năm bản thể tung chiêu và hợp kích bảy bản thể; không lỗi JavaScript, không warp Thiên Vũ. Chế độ Nhẹ/Giảm chuyển động vẫn giữ atlas.
- `thienvu-pixel-review.png`: bảy dạng ở 4×, tám động tác và bốn ảnh combat trong trình duyệt. Các trận dùng kẻ địch/tài nguyên dựng sẵn để lặp lại kiểm tra; chưa thử trên điện thoại vật lý. `thienvu-pixel-sheet-preview.png` có đủ các động tác của bảy dạng và toàn bộ VFX, phóng 4× nearest.

Nguồn dùng các khối cứng có trọng số xương, emission và skinning cho chuyển động bake; không phục vụ xuất nhân vật 3D. Tia raster hiện giới hạn tầm kỹ năng 2048 đơn vị; nếu thêm kỹ năng dài hơn, chia tia thành đoạn. Các ảnh random/wire hỗ trợ kiểm tra hình học nguồn.
