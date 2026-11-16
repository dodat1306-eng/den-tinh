Hãy thêm nhân vật chơi được thứ 6 tên là **Quỳnh Kun** (`id: 'quynhkun'`) vào game **Đèn Tinh: Miền Sương Lạc** (`E:\Games\DenTinh`).

YÊU CẦU TUYỆT ĐỐI:
- **KHÔNG làm sơ sài, KHÔNG tự ý bịa đặt hay lược bỏ** bất kỳ chi tiết ngoại hình, hiệu ứng chiêu thức, thông số kỹ năng hay cốt truyện nào dưới đây.
- **KHÔNG dùng hình tròn/chữ nhật tạm bợ** thay cho sprite nhân vật hoặc VFX. Phải dựng mesh 3D thật trong Blender thông qua `design/blender/pixel_pipeline.py` (giống hệt quy trình của `quanle` và `hoavi`), xuất ra atlas PNG/JSON/JS đạt chuẩn `1 texel = 2×2 pixel`, chiều cao đứng `43 texels (86px)`, viền mực `#12091a` và bảng màu 4 sắc độ.
- **KHÔNG làm hỏng tiến độ lưu cũ (save compatibility)** và không làm gãy bất kỳ nhân vật nào trong 5 nhân vật hiện có (`an`, `linh`, `quanle`, `hoavi`, `thienvu`).
- Tham chiếu hình ảnh thiết kế đã duyệt tại: `C:/Users/ASUS/.gemini/antigravity/brain/4f70742f-d1ea-4cab-a2f5-b69122b7a8f7/quynh_kun_concept_braids_v2_1794847206718.jpg`.

---

## PHẦN 1: NGOẠI HÌNH & DỰNG MÔ HÌNH 3D BLENDER -> PIXEL ATLAS (`design/blender/quynhkun/build_quynhkun_pixel.py`)

Dựng script `design/blender/quynhkun/build_quynhkun_pixel.py` sử dụng `Atlas`, `Mesh`, `PALETTES`, `PITCH = 0.045`, `UP` từ `design/blender/pixel_pipeline.py` để bake ra:
1. `assets/quynhkun-pixel-v1.png`, `assets/quynhkun-pixel-v1.json`, `assets/quynhkun-pixel-v1.js` (`globalThis.DTQuynhKunAtlas`).
2. `assets/quynhkun-vfx-pixel.png`, `assets/quynhkun-vfx-pixel.json`, `assets/quynhkun-vfx-pixel.js` (`globalThis.DTQuynhKunVFX`).

### 1.1. Đặc tả chi tiết ngoại hình 3D Mesh của Quỳnh Kun (Bắt buộc có đủ mọi bộ phận, không được thiếu)
- **Tỷ lệ & Chiều cao:** Chibi 3.5 đầu giống `quanle` và `hoavi`, `target_h = 43` (43 texels ở hướng S/E/W, 40–43 texels ở hướng N, hiển thị 2x = 86px, chung đường chân `anchorY = 58` trên ô `64×64`). Không bao giờ lật gương (mirror) trái/phải bằng âm scale; phải xoay ma trận 3D theo 4 góc `VIEWS = {'S': 0.0, 'E': math.pi/3, 'N': math.pi, 'W': -math.pi/3}`.
- **Bảng màu 4 bậc (`PALETTES`):**
  - `qkhair` (Tóc đen ánh tím than): `['#0c0914', '#181326', '#2a223d', '#493c66']`
  - `qkskin` (Da ấm hồng hào): `['#79516a', '#ebb89b', '#ffe0cc', '#fff0e5']`
  - `qkaodai` (Áo dài cách tân chàm huyền): `['#111c2b', '#1c324a', '#2c5270', '#4f82a6']`
  - `qkred` (Đỏ chu sa & dây tết): `['#4a121b', '#8c1d2c', '#d9384a', '#ff7a70']`
  - `qkgold` (Đồng xu Phát, khoen đồng & bùa hoàng kim): `['#5e3e1c', '#a67129', '#e6b347', '#fff099']`
  - `qkwood` (Chuỗi hạt tràng gỗ trầm & cán bút): `['#2b190e', '#54341e', '#875836', '#c28d5b']`
  - `qkpants` (Quần ống suông kem ngà): `['#473c38', '#857468', '#cfc0b0', '#f7efe4']`
  - `qkglass` (Mắt kính râm tròn thầy bói): `['#09080d', '#161824', '#2e384d', '#6c809e']`
- **Kiểu tóc — Tết tóc 2 bên rõ nét (TUYỆT ĐỐI KHÔNG búi tóc trên đỉnh đầu):**
  - Đỉnh đầu rẽ ngôi giữa gọn gàng (không có búi tóc, không có trâm cài trên đỉnh).
  - **2 bím tóc tết dày và dài buông xuống hai bên vai (`side in (-1, 1)`)**: Phải uốn cong xòe rõ ra hai bên ngoài bờ vai (`x` mở rộng từ `0.34` ra `0.46 -> 0.56 -> 0.65`) để tách biệt hoàn toàn khỏi màu áo chàm tối ở ngực, giúp nhìn rõ 2 bím tóc ở cả 4 góc S/E/N/W.
  - Mỗi bím tóc gồm ít nhất 4 đốt tết rõ khối, có dây buộc đỏ (`qkred`) ở gốc bím tóc, khoen đồng vàng (`qkgold`) ở đoạn giữa, dây nơ đỏ nổi bật ở cổ bím tóc và phần đuôi tóc xòe nhẹ như đầu cọ ở cuối. Khi chạy/lướt/tung chiêu, 2 bím tóc phải đung đưa theo nhịp `phase`.
- **Kính râm tròn thầy bói ĐẨY TRÊN TRÁN:**
  - Hai tròng kính tròn màu đen khói (`qkglass`) bọc gọng đồng vàng (`qkgold`) nối cầu kính ở giữa, **đặt cao trên trán (`z ≈ 1.93`)**, có chấm phản quang trắng nhỏ.
  - Phía dưới trán vẫn phải vẽ đầy đủ **đôi mắt sắc sảo có tròng đỏ chu sa/hổ phách** và chân mày rõ ràng (KHÔNG đeo kính che mắt ở trạng thái thường).
  - **NGOẠI LỆ DUY NHẤT:** Trong clip `r_ult` (khi niệm Tuyệt Kỹ R), kính râm tròn được hạ xuống che ngang đúng vị trí đôi mắt (`z ≈ 1.72`) để thể hiện trạng thái *"Khai Nhãn Âm Dương"*.
- **Trang phục — Áo dài cách tân:**
  - Áo dài cách tân nam/trung tính tà ngắn ngang bắp chân (`qkaodai`), xẻ tà trước/sau và hai bên hông, có cổ đứng viền đỏ chu sa (`qkred`), đai lưng và viền gấu tà áo màu đỏ chu sa kèm họa tiết mây đồng vàng.
  - Mặc bên trong là quần lụa ống suông màu kem sáng (`qkpants`) và giày cổ thấp màu tối (`#0c0914`).
- **Phụ kiện cổ — Đồng Xu Phát:**
  - Dây tết chỉ đỏ (`qkred`) vòng qua cổ, treo một **Đồng Xu Phát cổ bằng đồng vàng lớn (`qkgold`)** nằm chính giữa ngực (`z ≈ 1.14`), chính giữa đồng xu có lỗ vuông tối màu `#12091a`.
- **Phụ kiện tay & Vũ khí cầm tay:**
  - Cả hai cổ tay đều đeo **Chuỗi Hạt Tràng (`qkwood` xen kẽ hạt `qkgold`)** gồm các hạt tròn quấn quanh cổ tay.
  - **Tay phải:** Cầm **Bút Lông Chu Sa** (cán gỗ `qkwood`, đầu lông bút thấm mực đỏ chu sa rực rỡ `qkred`).
  - **Tay trái:** Cầm **Xấp Lá Bùa Hoàng Kim** xòe hình quạt (`qkgold`) có vệt chữ bùa đỏ (`qkred`) trên mặt giấy.

### 1.2. Các Clip Chuyển Động Nhân Vật (`DTQuynhKunAtlas`)
Bake đủ 4 hướng (`S`, `E`, `N`, `W`) cho toàn bộ 8 trạng thái:
- `idle` (4 frames), `run` (6 frames), `dash` (4 frames), `attack` (5 frames), `q_cast` (6 frames), `e_cast` (6 frames), `r_ult` (6 frames), `hit` (2 frames).
- Động tác phải có lấy đà (windup), bung lực (release) và thu thế (recovery):
  - `attack`: Tay phải vung bút chu sa kết hợp tay trái búng lá bùa vàng về phía trước, tà áo dài và 2 bím tóc bay theo quán tính.
  - `q_cast`: Xoay người quét rộng bút lông chu sa vẽ một vòng cung mực đỏ lớn trước mặt.
  - `e_cast`: Tung chuỗi hạt tràng và dậm chân cắm cọc bùa xuống đất.
  - `r_ult`: Kính râm hạ xuống mắt, hai tay giang rộng triệu hồi vòng Bùa Hoàng Kim bay quanh người.

### 1.3. Các Clip Hiệu Ứng Chiến Đấu Riêng (`DTQuynhKunVFX`)
Bake bằng mesh 3D trong `assets/quynhkun-vfx-pixel.png` (tương tự `quanle-vfx-pixel.png`), tuyệt đối không dùng hình vẽ phẳng sơ sài:
1. `talisman_bolt` (`48×48`, 6 frames): Đạn đánh thường — Lá bùa vàng chữ đỏ xoay sắc nét kèm vệt tàn chu sa.
2. `cinnabar_slash` (`64×64`, 6 frames): Đòn đánh thường thứ 3 — Lưỡi mực chu sa hình bán nguyệt đỏ-vàng kèm giọt mực bắn tung.
3. `grand_talisman` (`80×80`, 6 frames): Đạn/luồng chiêu Q — Đạo Đại Phù Thiên Cương khổng lồ cháy viền lửa chu sa.
4. `curse_mark_1` đến `curse_mark_5` (`48×48`, 4 frames mỗi mức): Vòng ấn chữ triện chu sa xoay quanh chân/thân mục tiêu bị khắc từ 1 đến 5 nét Chu Sa (hiển thị rõ số nét từ 1 tới 5 cánh ấn).
5. `talisman_burst` (`96×96`, 6 frames): Vụ nổ Phù Bạo khi đủ 5 nét Chu Sa — Bùng nổ giấy bùa vàng, tia sét đỏ chu sa và chữ triện bung tỏa.
6. `bagua_stake` (`96×96`, 6 frames): Cọc Trấn Bát Quái của chiêu E — Cọc gỗ đào khắc chú cắm giữa tâm, xung quanh là 8 lá bùa vàng nối bằng sợi chỉ đỏ xoay tròn trên mặt trận Bát Quái.
7. `ward_orbit_back` và `ward_orbit_front` (4 hướng `S/E/N/W`, `64×64`, 6 frames): Vòng Bùa Hộ Thể & Đồng Xu Phát xoay quanh Quỳnh Kun khi tái kích hoạt E (*Thu Phù*), dùng chung transform với thân nhân vật giống cơ chế `shadow_armor_back/front` của Quân Lê.
8. `heaven_seal_array` (`160×112`, 6 frames): Đại trận Thái Cực Bát Quái trên mặt đất của chiêu R.
9. `thunder_talisman_drop` (`64×96`, 6 frames): Đạo Bùa Thiên Lôi kèm tia sét đỏ-vàng giáng thẳng từ trên trời xuống trong chiêu R.

---

## PHẦN 2: THÔNG SỐ, NỘI TẠI & CHIÊU THỨC CHI TIẾT

### 2.1. Khai báo Nhân vật (`world.js`, `content.js`, `mythic-content.js`)
- `id`: `'quynhkun'`
- `name`: `'Quỳnh Kun'`
- `role`: `'THẦY CÚNG VẼ BÙA'`
- `color`: `'#ff6b6b'` (Đỏ Chu Sa sáng), `cloth`: `'#1c324a'` (Chàm Huyền), `accent`: `'#ffd166'` (Vàng Đồng Xu Phát)
- Chỉ số cơ bản: `hp: 115`, `speed: 240`, `damage: 17`, `fireRate: 0.21`, `shotSpeed: 760`, `qCd: 5`, `eCd: 9`, `rCd: 19`.
- **Bảo khí riêng (`DTMythic.signature.quynhkun`):**
  - `id: 'cinnabar-brush'`, `name: 'Chu Sa Phù Bút'`, `kind: 'talisman'`, `color: '#ffd166'`, `desc: 'Bút chu sa và xấp bùa hoàng kim; khắc đủ năm nét bùa sẽ kích nổ tà khí.'`
- **4 nhánh kỹ năng K (`DTMythic.nodeNames.quynhkun`):**
  - `['Họa Phù', 'Trấn Trạch', 'Thiên Mệnh', 'Chu Sa Tuyệt Bút']`

### 2.2. Đánh thường (`fire()` trong `ascension.js`)
- Bắn ra lá bùa `talisman_bolt` (tốc độ `760`, sát thương `1.0 * damage * scale`, `r: 5`, `life: 1.15`, `signature: true`).
- Mỗi **đòn đánh thường thứ 3** (`s.attackCount % 3 === 0`): Quỳnh Kun vung bút phóng thêm một luồng **Chu Sa Trảm** (`cinnabar_slash`, xuyên 1 mục tiêu, gây `1.35 * damage * scale`, làm chậm nhẹ `0.8s`) và khắc thẳng **2 nét Chu Sa** thay vì 1 nét.
- Phân loại sát thương RPG (`v09.js`): `'normal'` (nhận加成 từ `STR`, `AGI`, `DEX`, cổ vật *Nỏ Liên Châu*, *Mũi Giáo Xuyên Vân*, *Tâm Hỏa*).

### 2.3. Nội tại: `Ngũ Lôi Chu Sa Ấn` (`passives.quynhkun`)
- **Cơ chế Khắc Bùa (Trên kẻ địch):**
  - Mỗi đòn đánh thường hoặc kỹ năng của Quỳnh Kun trúng địch sẽ khắc **+1 Nét Chu Sa** (`e.talismanMarks = (e.talismanMarks || 0) + 1`, tồn tại `6 giây`, hiển thị vòng ấn `curse_mark_1..4` dưới chân/quanh người địch).
  - Khi mục tiêu đạt đủ **5 Nét Chu Sa (`e.talismanMarks >= 5`)**:
    - Xóa số nét (`e.talismanMarks = 0`) và kích hoạt **Phù Bạo (`talisman_burst`)** tại vị trí mục tiêu:
    - Gây sát thương nổ vùng bán kính `110 px` bằng `damage * (2.2 + 0.35 * skillRanks.passive)` (phân loại sát thương `'skill'`, hưởng lợi từ `INT` và `AURA`).
    - Làm **Choáng `0.5 giây`** đối với quái thường; đối với Boss thì gây `weakened = 1.5` và làm chậm `25%` trong `1.5 giây`.
    - Nếu đã nâng nhánh Nội Tại (`skillRanks.passive >= 1`), vụ nổ bắn mực chu sa sang **1 kẻ địch còn sống gần nhất trong `220 px`**, khắc sẵn cho mục tiêu đó `1 + Math.floor(skillRanks.passive / 2)` Nét Chu Sa.
- **Cơ chế Đồng Xu Phát (Trên bản thân Quỳnh Kun):**
  - Mỗi lần kích hoạt **Phù Bạo** (hoặc mỗi đòn đánh thứ 3 trúng đích), Quỳnh Kun tích **+1 Lộc Khí** vào Đồng Xu Phát (`s.coins = Math.min(6, (s.coins || 0) + 1)`), đồng thời hồi `5 + skillRanks.passive * 1.5` MP và nhận `8 + skillRanks.passive * 4` Khiên (cộng dồn tối đa đến mốc `65` khiên).
  - Khi đủ **6/6 Lộc Khí (`s.coins >= 6`)**: Kỹ năng **Q** hoặc **E** kế tiếp sẽ tiêu thụ toàn bộ 6 Lộc Khí để kích hoạt trạng thái **Thỉnh Thần**, cường hóa chiêu thức đó và giảm ngay `1.5 giây` hồi chiêu của kỹ năng còn lại.
- **Hiển thị trạng thái nội tại trên HUD (`passiveStatus()`):**
  - `'Lộc Khí Đồng Xu ' + (s.coins || 0) + '/6 · Trận Bát Quái ' + activeStakes + '/2' + (recastReady ? ' · E thu phù hộ thể' : '')`

### 2.4. Chiêu Q: `Họa Phù · Thiên Cương Trảm`
- **Thông số:** `cost: 24`, `cooldown: 5`, `windup: 0.14s`.
- **Cơ chế cơ bản:**
  - Quét bút chu sa phóng đạo **Đại Phù Thiên Cương** (`grand_talisman`) dọc theo hướng ngắm dài `680 px`, rộng `26 px`, xuyên qua mọi kẻ địch trên đường bay.
  - Gây `3.4 * power` sát thương kỹ năng (`'skill'`), làm chậm `1.2s` và khắc ngay **+2 Nét Chu Sa** lên mọi kẻ địch trúng chiêu (nếu đủ 5 nét sẽ nổ Phù Bạo ngay lập tức).
- **Cường hóa Thỉnh Thần (Khi tiêu thụ 6 Lộc Khí Đồng Xu):**
  - Phóng **3 đạo Đại Phù hình rẻ quạt** (góc `angle - 0.18`, `angle`, `angle + 0.18`).
  - Mọi kẻ địch trúng chiêu nếu đang có từ **3 Nét Chu Sa trở lên** sẽ bị **kích nổ Phù Bạo tức thì** mà không cần đợi đủ 5 nét!
- **Chuyên môn hóa bậc 3 (`specs.q` trong `journey.js`):**
  - `focus` (*Tập Trung*): Sát thương +25%, tầm xa tăng lên `780 px`, khắc thẳng **+3 Nét Chu Sa**.
  - `burst` (*Bộc Phát*): Sát thương chính −15%, nhưng để lại thảm bùa cháy dọc đường bay và nổ vùng `110 px` tại điểm cuối.

### 2.5. Chiêu E: `Trấn Trạch Bát Quái Trận` (Có Tái Kích Hoạt Lần 2: `Thu Phù Hộ Thể`)
- **Thông số:** `cost: 30`, `cooldown: 9`, `windup: 0.14s`.
- **Lần 1 — Cắm Cọc Bùa Bát Quái:**
  - Đặt một trận địa `kind: 'bagua-stake'` tại vị trí điểm ngắm hợp lệ (bán kính `145 px`, tồn tại `7 + skillRanks.e * 0.8` giây, tối đa **2 trận** cùng lúc; nếu đặt trận thứ 3 thì thay thế trận cũ nhất).
  - Trong `v09.js`, `bagua-stake` được tính vào nhóm `summon` (tương tự `lantern` của An và `satellites` của HoaVi) để hưởng trọn chỉ số **DOM (Thống Lĩnh)** và **AURA (Uy Áp)**.
  - Khi vừa đặt xuống: Kẻ địch trong bán kính `145 px` bị **Dây Chỉ Đỏ trói chân (`rooted = 1.2s`, Boss `0.35s`)**.
  - Mỗi `0.75 giây` (`tick`), cọc bùa phát xung Bát Quái (`bagua_stake`), gây `0.75 * power` sát thương `'summon'` lên toàn bộ địch trong vùng, làm chậm `30%` đạn địch bay ngang qua và khắc **+1 Nét Chu Sa** lên mỗi kẻ địch trong trận.
  - Mở cửa sổ tái kích hoạt E trong **4.0 giây** (`this.quynhRecastUntil = this.time + 4`, nút E trên HUD/cảm ứng hiện chữ `THU PHÙ` hoặc `NỔ` thông qua `canRecastE()`).
- **Lần 2 — Tái kích hoạt E trong vòng 4 giây (`Thu Phù Hộ Thể`):**
  - Không tốn MP. Thu hồi toàn bộ các `bagua-stake` đang tồn tại:
  - Tại vị trí mỗi cọc bùa trước khi thu về: **Kéo nhẹ các quái thường trong bán kính `260 px` về tâm cọc** rồi phát nổ gây `1.9 * damage` sát thương vùng.
  - Quỳnh Kun nhận trạng thái **Vòng Bùa Hộ Thể (`p.talismanWard = 4.5` giây)**:
    - Hiển thị lớp hiệu ứng `ward_orbit_back` và `ward_orbit_front` xoay quanh người.
    - Cấp ngay `25 + skillRanks.e * 6` Khiên, tăng `20%` tốc độ chạy trong `4.5 giây`.
    - Mỗi `0.55 giây`, Vòng Bùa Hộ Thể tự động phóng 1 lá bùa (`talisman_bolt`) vào kẻ địch gần nhất trong `380 px` gây `0.85 * damage` sát thương `'summon'` và khắc **+1 Nét Chu Sa**.
- **Chuyên môn hóa bậc 3 (`specs.e` trong `journey.js`):**
  - `lasting` (*Bền Vững*): Thời gian tồn tại cọc bùa +40%, nhận thêm 15 khiên và hồi `2.5 HP/s` khi đứng trong trận Bát Quái.
  - `agile` (*Ứng Biến*): Hồi chiêu E giảm 25% và tăng 15% tốc chạy trong 2 giây.

### 2.6. Chiêu R (Tuyệt Kỹ): `Cấp Cấp Như Luật Lệnh · Bách Phù Trấn Thiên`
- **Thông số:** `cost: 0`, `rCd: 19` giây (tính hồi chiêu ngay khi bắt đầu Intro).
- **Hoạt cảnh Ultimate Intro 4.5 giây (`ultimate-intro.js`):**
  - Tuân thủ đúng quy chuẩn `0.8.2`: Nhân vật miễn sát thương/khống chế, di chuyển 35%; địch trong `520 px` di chuyển/ra đòn 25% và bị đẩy lùi nhẹ mỗi `0.8s`; lưu trạng thái vào save và không phát chiêu 2 lần khi tải lại.
  - Trong `ultimate-intro.js`, thêm hàm `quynhkun(c, x, y, t, calm)` và bộ câu chữ `words.quynhkun`:
    `['CẤP CẤP NHƯ LUẬT LỆNH — BÁCH PHÙ TRẤN THIÊN!', 'KHAI NHÃN ÂM DƯƠNG · ĐỊNH MẠCH CHU SA', 'BÁT QUÁI THÁI CỰC TRẬN KHAI MỞ', 'VẠN PHÙ QUY TÔNG · TRẤN YỂM TÀ MA', 'CẤP CẤP NHƯ LUẬT LỆNH']`
  - Hình ảnh Intro trên canvas:
    - Vẽ đồ hình **Bát Quái Thái Cực** lớn dưới chân xoay ngược chiều kim đồng hồ bằng sắc vàng đồng `#FDE047` và đỏ chu sa `#EF4444`.
    - `t >= 1.2s`: 8 Cột Phù Chú dựng lên ở 8 phương Bát Quái kèm dây chỉ đỏ nối về Đồng Xu Phát trước ngực Quỳnh Kun; kính râm tròn trên trán nhân vật hạ xuống che mắt.
    - `t >= 2.6s`: 24 lá bùa vàng chữ đỏ bay lơ lửng thành vòng xoáy quanh thân và hiện dòng chữ `'CẤP CẤP NHƯ LUẬT LỆNH'` phía trên.
- **Khi kết thúc Intro (Nhả Tuyệt Kỹ `releaseCast`):**
  - Khai mở **Đại Trận Bách Phù** (`kind: 'heaven-seal'`, bán kính `250 px` tại điểm ngắm hoặc quanh người, tồn tại `8 + skillRanks.r * 1.2` giây).
  - Ngay khi khai trận: Gây `2.4 * power` sát thương vùng và khắc **+2 Nét Chu Sa** lên mọi kẻ địch trong trận.
  - Trong suốt thời gian Đại Trận tồn tại (`updateFields` / `castQueue`):
    - Cứ mỗi `0.32 giây`, giáng một đạo **Bùa Thiên Lôi (`thunder_talisman_drop`)** xuống vị trí kẻ địch trong trận (ưu tiên kẻ địch đang có Nét Chu Sa), gây `1.45 * power` sát thương kỹ năng vùng `75 px` và khắc **+1 Nét Chu Sa**.
    - **Đặc tính Trấn Thiên:** Mọi vụ nổ **Phù Bạo (đủ 5 Nét Chu Sa)** xảy ra đối với kẻ địch nằm trong Đại Trận sẽ gây thêm **35% sát thương chuẩn (`'true'` damage)**!

---

## PHẦN 3: CỐT TRUYỆN & TUYẾN NHIỆM VỤ CÁ NHÂN (`v09-content.js` & `v09.js`)

### 3.1. Hợp lý hóa vào cốt truyện Đêm Thực Nhật
- Trong `v09-content.js`, Ông Từ Đạo từng nói: *"Sổ Đinh thiếu bảy trang, nhưng tro chỉ còn năm khoảng tên."*
- **Quỳnh Kun chính là chủ nhân của Trang Sổ Đinh Thứ Sáu:** Mười tám năm trước, trong Đêm Thực Nhật, Bà Năm ép Quỳnh Kun — người thầy cúng trẻ tuổi nhất làng — vẽ *Ngũ Đinh Tuyệt Mệnh Phù* lên 3 chiếc Đinh Phong Ấn để giết chết 5 vật tế (An, Linh, Quân Lê, HoaVi, Thiên Vũ). Không đành lòng nhìn 5 người vô tội tan xác, Quỳnh Kun đã cắn máu ngón tay pha vào chu sa, lén sửa nét bút cuối thành *Tâm Ấn Hộ Hồn Phù*, chuyển hướng lời nguyền sang gốc Cội Đa để cứu mạng cả 5 người. Để che giấu việc tráo bùa và chịu phản phệ thiên cơ, Quỳnh Kun tự xé trang Sổ Đinh thứ sáu ghi tên mình, gấp thành lá *Ẩn Danh Phù* nuốt vào ngực và ngủ vùi trong vách đình làng suốt 18 năm.

### 3.2. Dữ liệu `stories.quynhkun`, `memories` và `quests.quynhkun` trong `v09-content.js`
- Thêm vào `stories`:
  ```js
  quynhkun: {
    intro: 'Mực chu sa trên ba chiếc đinh đang phai. Đã đến lúc người cầm bút năm xưa thu hồi nét chữ cuối.',
    relic: 'Nghiên Chu Sa Nứt & Trang Sổ Thứ Sáu',
    ending: 'Quỳnh Kun trả lại trang Sổ Đinh thứ sáu và khắc ấn hộ mệnh mới cho Làng Đèn.'
  }
  ```
- Thêm các vật phẩm ký ức (`memories`) cho `quynhkun`:
  1. `memory('cinnabar-inkstone', 'quynhkun', 'Nghiên Chu Sa Nứt', 3180, 2120, 'Dưới đáy nghiên còn vết máu khô hòa cùng chu sa. Đêm Thực Nhật, Quỳnh Kun đã sửa chữ Tuyệt thành chữ Hộ để giữ lại năm linh hồn.')`
  2. `memory('nail-talisman-1', 'quynhkun', 'Tàn Phù Ấn Trúc', 860, 740, 'Mảnh bùa thứ nhất trấn trên đinh sắt. Nét bút bị cố tình vẽ lệch một phân để linh hồn người hiến tế có khe thở.')`
  3. `memory('nail-talisman-2', 'quynhkun', 'Tàn Phù Ấn Sen', 3060, 2050, 'Mảnh bùa thứ hai thấm nước sen nhưng chữ máu không trôi. Cội Đa đã nhận ra thiện ý của người vẽ bùa.')`
  4. `memory('nail-talisman-3', 'quynhkun', 'Tàn Phù Ấn Tro', 3050, 730, 'Mảnh bùa thứ ba cháy sém bên lò rèn. Phản phệ đêm ấy đã xóa tên người thầy cúng khỏi ký ức cả làng.')`
  5. `memory('sixth-page', 'quynhkun', 'Trang Sổ Đinh Thứ Sáu', 690, 1990, 'Trang giấy gấp thành hình lá bùa cất dưới gạch đình làng, ghi rõ cái tên thứ sáu chưa từng hóa tro: Quỳnh Kun.')`
- Thêm chuỗi nhiệm vụ `quests.quynhkun`:
  ```js
  quynhkun: {
    reward: 'Thiên Phù Đại Pháp Sư',
    ending: 'Nét bút năm xưa không còn phải giấu trong bóng tối. Quỳnh Kun đẩy nhẹ chiếc kính râm trên trán, giữ lại cả tên mình lẫn bình yên của ngôi làng.',
    steps: [
      talk('temple_keeper', 'Trang Giấy Không Thành Tro', 'Sổ Đinh mất bảy trang mà tro chỉ có năm tên. Ngươi… chính là người thầy cúng đã tự xé trang thứ sáu trong đêm ấy sao?', 'Gặp Ông Từ Đạo tại Đình Làng.'),
      talk('scholar_ghost', 'Thứ Mực Không Trôi', 'Dưới bùn Đầm Sen có một nghiên mực đỏ suốt mười tám năm không bị Nước Quên Lãng làm phai chữ.', 'Hỏi Thư Sinh Mặc Khách tại Đầm Sen.'),
      find('cinnabar-inkstone', 'Máu Trên Đầu Bút', 'Tìm Nghiên Chu Sa Nứt tại bờ đông Đầm Sen (3180, 2120).'),
      all(['nail-talisman-1', 'nail-talisman-2', 'nail-talisman-3'], 'Ba Đạo Phù Tráo Mệnh', 'Thu hồi ba mảnh Tàn Phù tại Ấn Trúc, Ấn Sen và Ấn Tro.'),
      find('sixth-page', 'Lá Bùa Mang Tên Mình', 'Lấy lại Trang Sổ Đinh Thứ Sáu cất giấu bên hiên Đình Làng (690, 1990).'),
      {kind: 'truth', title: 'Giải Chú Trả Tên', hint: 'Mở ba Ấn, giải thoát Cội Đa rồi nhấn F trả ký ức cho làng.'},
      talk('temple_keeper', 'Chữ Ký Của Thầy Phù Thủy', 'Trang thứ sáu đã về lại Sổ Đinh. Làng Đèn từ nay sẽ nhớ người đã lén cứu năm sinh mạng đêm ấy.', 'Trở lại báo cho Ông Từ Đạo.')
    ]
  }
  ```

---

## PHẦN 4: ĐỒNG BỘ GIAO DIỆN, BUILD WEB, UNITY & RÀ LỖI (QA CHECKLIST BẮT BUỘC)

### 4.1. Danh sách tệp cần cập nhật đồng bộ
1. **Blender & Assets:**
   - Tạo `design/blender/quynhkun/build_quynhkun_pixel.py`, chạy qua Blender để sinh `assets/quynhkun-pixel-v1.{png,json,js}`, `assets/quynhkun-vfx-pixel.{png,json,js}`, cùng ảnh kiểm tra `design/blender/quynhkun/quynhkun-actions-preview.png` và `design/blender/quynhkun/scale-verification.png`.
2. **Web Runtime & Visuals:**
   - Tạo `quynhkun-pixel.js` (tương tự `quanle-pixel.js`) để vẽ sprite nhân vật `quynhkun`, vòng `ward_orbit_back/front`, cọc `bagua_stake`, ấn `curse_mark_1..5`, đạn `talisman_bolt` và hiệu ứng nổ bùa.
   - Cập nhật `world.js`, `content.js`, `mythic-content.js`, `ascension.js`, `journey.js`, `v09-content.js`, `v09.js`.
   - Cập nhật `visuals.js`, `ascension-visuals.js`, `journey-visuals.js`, `v09-visuals.js`, `choreography.js`, `ultimate-intro.js` để chân dung menu, thẻ chọn tướng (`#heroCards`), HUD (nút E đổi nhãn khi tái kích hoạt), hoạt ảnh nghiêng người và Intro R hoạt động mượt mà.
   - Cập nhật `index.html`, `tools/server.cjs`, `tools/build-web.cjs` để nạp `assets/quynhkun-pixel-v1.js`, `assets/quynhkun-vfx-pixel.js`, `quynhkun-pixel.js`, cập nhật dòng chữ menu thành `6 NHÂN VẬT` và đóng gói đầy đủ sang `dist/`.
3. **Đồng bộ Unity C# (nếu project kiểm tra đồng bộ Unity):**
   - Cập nhật `Unity/Assets/Scripts/Core/Definitions.cs`, `CatalogData.cs`, `RpgCatalog.cs`, `Simulation.cs`, `Unity/Assets/Scripts/Runtime/DenTinhGame.cs`, `PixelArt.cs` và copy atlas mới vào `Unity/Assets/Resources/` thông qua `tools/export-unity-content.cjs`.

### 4.2. Quy trình Rà Lỗi & Kiểm Chứng Bắt Buộc (KHÔNG ĐƯỢC BỎ QUA)
Sau khi code xong, bắt buộc phải thực hiện tuần tự các bước rà lỗi sau và sửa triệt để mọi lỗi phát sinh trước khi báo cáo hoàn thành:

1. **Rà lỗi Hình học & Tỷ lệ Sprite (Visual & Scale Audit):**
   - Kiểm tra `bake-report.json` của Blender: `pass: true`, không có frame trống (`empty`), không có flipbook đứng yên (`static flipbook`), alpha chỉ gồm `{0, 255}`, viền ngoài đúng màu `#12091a`.
   - Kiểm tra chiều cao thực tế của `quynhkun` ở `S/idle`, `E/idle`, `W/idle` phải nằm chuẩn trong khoảng `41–44 texels` (82–88px khi vẽ 2x), ngang bằng với `HoaVi`, `Thiên Vũ`, `Quân Lê`, `An`, `Linh`.
   - Kiểm tra bằng mắt ảnh preview: **Phải nhìn rõ 2 bím tóc tết 2 bên có dây đỏ xòe khỏi vai, kính râm tròn nằm trên trán (trừ `r_ult` kéo xuống mắt), đồng xu Phát vàng giữa ngực, áo dài cách tân chàm viền đỏ chu sa, tay phải cầm bút chu sa, tay trái cầm xấp bùa vàng.**

2. **Rà lỗi Logic Chiến đấu & Edge Cases (Combat & Save Audit):**
   - Kiểm tra đánh thường đòn thứ 3 có phóng `cinnabar_slash` và khắc 2 nét Chu Sa không.
   - Kiểm tra khi mục tiêu đủ 5 nét Chu Sa có kích nổ Phù Bạo, gây sát thương vùng, cộng Lộc Khí Đồng Xu (`0..6`), hồi MP và tạo khiên không; đảm bảo không bị vòng lặp đệ quy vô hạn (`infinite recursion`) khi bùa nổ lan giữa nhiều quái.
   - Kiểm tra chiêu Q khi có đủ 6 Lộc Khí có bắn 3 đạo bùa rẻ quạt và kích nổ sớm mục tiêu `>= 3` nét Chu Sa không.
   - Kiểm tra chiêu E đặt tối đa 2 cọc `bagua-stake`, nhấn E lần 2 trong 4 giây có thu cọc, gom quái thường và bật `talismanWard` (Vòng Bùa Hộ Thể) không.
   - Kiểm tra chiêu R có chạy đủ 4.5 giây Intro miễn thương, hiển thị đúng đồ hình Bát Quái trong `ultimate-intro.js`, lưu/khôi phục giữa chừng qua `serialize()` / `restore()` mà không bị kẹt trạng thái hoặc nổ chiêu 2 lần không.
   - Kiểm tra toàn bộ 12 chỉ số RPG (`str, agi, vit, int, spi, dex, fer, def, vamp, dom, aura, lck`) và 32 cổ vật có tương tác đúng với Quỳnh Kun không (đặc biệt là chỉ số `DOM` tăng sức mạnh/thời gian cho Cọc Bát Quái và Vòng Bùa Hộ Thể).
   - Kiểm tra 7 bước nhiệm vụ cá nhân `quests.quynhkun` có thể hoàn thành từ đầu đến cuối và nhận thưởng `+10% sát thương, 200 xu, 2 điểm kỹ năng` không.

3. **Chạy Bộ Test Tự Động:**
   - Viết thêm bài kiểm thử tự động `tools/quynhkun-test.cjs` kiểm tra toàn bộ cơ chế của Quỳnh Kun (đánh thường nhịp 3, nổ 5 nét Chu Sa, Lộc Khí Đồng Xu, Q cường hóa, E đặt cọc & tái kích Thu Phù, R intro 4.5s & Đại Trận, chuỗi nhiệm vụ cá nhân, lưu/tải save).
   - Chạy và đảm bảo **PASS 100%** tất cả các lệnh:
     - `node tools/quynhkun-test.cjs`
     - `npm test`
     - `npm run test:combat` (cập nhật để cả 6 nhân vật vượt qua toàn bộ chiến dịch)
     - `npm run test:elemental-http`
     - `npm run build:web`