# Đèn Tinh 0.8.0

- Làm lại môi trường của chín quần xã: sáu tile nền mỗi vùng, đường lát, cầu gỗ, nước và bọt nước hoạt ảnh. Atlas Blender đa diện có 395 frame, palette giới hạn, alpha nhị phân và viền ngoài/tách khớp một texel.
- Props trên bản đồ gốc và vùng sinh có bốn cấp phá hủy. Lửa cháy 2,5 giây, lan trong 85 px sau 0,9 giây; thân than sụp sau 3 giây. Tro còn lại không chặn đường, tung bụi khi bước qua. Đóng băng kéo dài 5 giây; đập vỡ gây sát thương vùng 95 px. Chém cây có hoạt ảnh ngã.
- Thêm dấu cháy âm ỉ, hố nứt, vết sét, thảm băng và tro rải; lửa làm tan băng thành hơi nước. Dấu vết có giới hạn 384 và tự hết hạn. Lưu trạng thái vật thể cả khi đổi vùng hoặc tải game; tương thích bản lưu cũ.
- Làm lại năm quái thường, bảy boss với hình và bốn bộ động tác riêng, Bà Năm, Chú Bảy, Cáo Đốm; thêm An/Linh/Kiệt bốn hướng. Atlas actors/hiệu ứng có 801 frame.
- Golem 80 × 80, treant 64 × 64, boss 96 × 96 và lốc 128 × 160 texel. Mọi hình mới cùng tỉ lệ 2 pixel/texel, tắt nội suy; không phóng sprite nhỏ bằng hệ số 3 hoặc 4.
- Web Canvas và Unity dùng chung ảnh/metadata; Unity dùng Point filtering, anchor chính xác, camera căn lưới và cùng máy trạng thái phá hủy.

## Kiểm tra

- `npm test`: các bộ gameplay, chuyển động và 17/17 kiểm tra world pixel đều đạt.
- `powershell -ExecutionPolicy Bypass -File tools/Test-Unity-Core.ps1`: toàn bộ kiểm tra C# đạt, gồm 18/18 tình huống phá hủy.
- `node tools/world-pixel-browser.cjs`: 9/9 đạt; di chuyển bằng phím, bảy boss, phá hủy, hai triệu hồi, giảm chuyển động và viewport 390 × 844. Cảnh bảy bản thể, 2301 props: trung vị 2.1 ms, p95 3.7 ms/khung trên máy kiểm tra; không phải số đo trên điện thoại thật.
- `node tools/build-web.cjs`: đóng gói 61 tài nguyên công khai theo allowlist.
- Biên dịch toàn bộ Runtime/Core/Editor với assembly Unity 6000.3.27f1 đạt. Editor batch build dừng mã 198 vì chưa có giấy phép kích hoạt; chưa phát hành bản Unity Windows/WebGL. Xem [Unity/README_VI.md](Unity/README_VI.md).

## Nguồn đồ họa

Pipeline tại `design/blender/pixel_pipeline.py`, `design/blender/world/build_world_pixel.py`, `design/blender/actors/build_actors_pixel.py`. Mỗi gói dựng mesh và bake trong một lần chạy Blender; có file `.blend`, báo cáo hình học và preview phóng 4× nearest neighbor để xem lại.
