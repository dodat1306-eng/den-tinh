from pathlib import Path
from PIL import Image, ImageDraw

OUT=Path(__file__).parents[1]/'assets'/'relics-pixel-v09.png'
im=Image.new('RGBA',(256,128),(0,0,0,0)); d=ImageDraw.Draw(im)
pal=['#e4b85f','#67b59b','#d66e54','#80a6d6','#b77ac0','#e6dfb2','#77c86c','#b58a64']
for i in range(32):
    ox=(i%8)*32; oy=(i//8)*32; main=pal[i%len(pal)]; hi=pal[(i+3)%len(pal)]
    d.ellipse((ox+5,oy+6,ox+27,oy+28),fill='#12091a')
    shape=i%6
    if shape==0: d.polygon([(ox+16,oy+5),(ox+24,oy+14),(ox+20,oy+27),(ox+10,oy+25),(ox+7,oy+14)],fill=main)
    elif shape==1: d.rounded_rectangle((ox+8,oy+7,ox+24,oy+26),3,fill=main); d.rectangle((ox+14,oy+3,ox+18,oy+10),fill=hi)
    elif shape==2: d.polygon([(ox+6,oy+19),(ox+13,oy+6),(ox+25,oy+9),(ox+27,oy+21),(ox+17,oy+27)],fill=main)
    elif shape==3: d.ellipse((ox+7,oy+7,ox+25,oy+25),fill=main); d.ellipse((ox+12,oy+12,ox+20,oy+20),fill='#12091a')
    elif shape==4: d.polygon([(ox+16,oy+3),(ox+22,oy+13),(ox+27,oy+16),(ox+20,oy+21),(ox+16,oy+29),(ox+12,oy+21),(ox+5,oy+16),(ox+11,oy+12)],fill=main)
    else: d.arc((ox+5,oy+5,ox+27,oy+28),20,320,fill=main,width=6); d.ellipse((ox+18,oy+6,ox+25,oy+13),fill=hi)
    d.rectangle((ox+13,oy+12,ox+16,oy+15),fill=hi); d.point((ox+11,oy+9),fill='#fff4cc'); d.point((ox+23,oy+20),fill='#fff4cc')
im.save(OUT)
print(OUT)
