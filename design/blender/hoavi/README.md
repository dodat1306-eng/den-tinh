# HoaVi — chibi pixel v08

Nguồn hiện tại: `hoavi.blend` và `hoavi-pixel-v08.blend`, scene `HOAVI_Pixel`, rig `HOAVI_Armature`. Bản dự phòng trước khi sửa (`hoavi-pre-pixel.blend`, `hoavi-v08.blend`) giữ cục bộ.

Đầu 0,88 m / toàn thân 1,94 m, khoảng 2,2 đầu; mắt phẳng, kính và hoa đào được cleanup trên từng khung. Một mesh, 1.000 tam giác, 36 xương, 20 vật liệu Emission; không Principled BSDF. Chân có IK hai khớp và khóa hướng bàn chân; kiểm tra toàn bộ frame cho sai số tối đa 0,0252 mm, chân ở mặt đất. Tóc, tay áo, tà áo, tua ngọc có xương phụ. Viền và trang trí dùng cùng weight với mảng áo; mỗi vertex có một weight chuẩn hóa. `HV_06_Codecraft` tách riêng và ẩn; đạo cụ được vẽ từ atlas hiệu ứng.

## Atlas

Ô gốc 64×64, anchor chân `(32,58)`, chiều cao đứng 46–48 pixel. 208 khung nhân vật / 4 hướng S/E/N/W, thêm 24 khung bóng hologram scanline. E/W dùng góc ba phần tư ±60° để mặt và áo đọc rõ, yaw ghi trong metadata; S/N là 0°/180°. Alpha chỉ 0/255, viền ngoài 1px `#12091a`, màu chỉ từ danh sách Hex trong yêu cầu. Danh sách thực tế có **25 màu**, dù prompt ghi 24. Metadata JSON và JS chứa cùng dữ liệu.

| Action | Frame | FPS |
| --- | ---: | ---: |
| idle | 6 | 8 |
| run | 8 | 14 |
| dash | 4 | 21 |
| attack | 5 | 18 |
| q_debug | 6 | 10 |
| e_cast | 6 | 12 |
| e_blink | 6 | 12 |
| r_overclock | 8 | 12 |
| hit | 3 | 17 |

Blender giữ key đóng vòng idle/run; atlas bỏ key trùng cuối. Interpolation CONSTANT cho nhịp lấy đà, bùng lực, thu thế. Camera ORTHO, Standard, RGBA, filter 0,01. EEVEE thử trong tiến trình có timeout; lỗi sẽ chuyển Cycles CPU 32 samples. Màu Emission không cần denoise; hậu kỳ vẫn lượng tử hóa, cắt alpha và dọn mặt từng frame.

`assets/hoavi-vfx-pixel.png` gồm 70 frame: muzzle 24×24/4, bolt 28×14/4, cửa sổ 36×36/6, ba phần tia Q 32×32/5 mỗi phần, ấn sen 56×56/8, cột dịch chuyển 48×64/5, bàn phím 36×16/4, vệ tinh 24×24/8, tia vệ tinh 32×16/4, trúng đòn 32×32/5, dấu lỗi 16×16/4, bóng chân và khiên pixel.

## Tái tạo và kiểm tra

```powershell
$blender = 'E:\Tools\Blender\5.2.3\blender.exe'
$pixelPython = 'C:\Users\ASUS\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $blender -b --python-exit-code 1 -P design/blender/hoavi/build_hoavi_pixel.py
& $blender -b design/blender/hoavi/hoavi-pixel-v08.blend --python-exit-code 1 -P design/blender/hoavi/verify_hoavi_pixel.py
& $pixelPython design/blender/hoavi/build_hoavi_vfx_pixel.py
& $pixelPython design/blender/hoavi/bake_hoavi_pixel.py
& $pixelPython design/blender/hoavi/bake_hoavi_pixel.py --verify-only
node tools/hoavi-pixel-test.cjs
npm test
node tools/choreography-browser.cjs
node tools/build-web.cjs
```

`bake_hoavi_pixel.py` dùng Pillow + NumPy; verifier mesh dùng skill `blender-asset-qa` đã cài tại máy. Bake tạo ảnh toàn bộ nhân vật, GIF, metadata và kiểm tra palette/alpha/viền/clip chuyển động. Bảng tổng hợp `hoavi-pixel-sheet-preview.png` ghép toàn bộ nhân vật và hiệu ứng ở 4× nearest; hình game là cảnh dựng fixture trong Chrome thật.

## Canvas và gameplay

`hoavi-pixel.js` dựng sprite ở 2× theo **pixel backing Canvas**, bỏ ảnh hưởng zoom camera lên lưới pixel; hình menu lớn dùng 3×. Thẻ chọn tướng render vào canvas 128×128 rồi hiển thị pixelated. UI/web viewport vẫn có thể scale toàn bộ game để vừa màn hình. Mọi lần vẽ HoaVi đều save/restore, tắt smoothing, làm tròn vị trí. Không warp, font chữ, gradient hay đường tròn/đường thẳng Canvas cho phép HoaVi. Đạn và tia lấy mẫu nearest từ atlas trên raster nhỏ rồi phóng đúng 2×, không phát sinh màu/alpha mới; cache đạn có giới hạn.

Q chụp gốc và góc khi bắt đầu cast, dùng cùng gốc cho tia, bóng chờ và echo. Echo vẫn phát sát thương từ hàng đợi sau đúng 0,35 giây kể từ lần phát chính; ray thật cắt ở tường, dấu lỗi cũng chỉ tới ray bị cắt. Bóng chờ nằm sau nhân vật. E lần hai ghi hai đầu trước khi dịch chuyển, dùng 12 lát bao phủ đủ 64 hàng. Vệ tinh lưu đầu ray/đích bị cắt từ chính `lineHit`; sprite 8 hướng nhìn theo dữ liệu này. Không thêm dữ liệu transient vào save; save cũ vẫn hủy action/queue như trước.

Báo cáo: `qa-pixel-geometry.json` (không lỗi/cảnh báo), `pixel-assets-verified.json`, `pixel-browser-verified.json`, `verification-pixel-v08.json`. Kiểm tra Chrome gồm DPR 1/2, zoom 0,8/1,28/2, màu/alpha, khối pixel 2×2, ray chéo/ngược/ngắn/zero length và khôi phục Canvas. Cảnh cảm ứng là giả lập; không tuyên bố đã kiểm tra thiết bị thật.
