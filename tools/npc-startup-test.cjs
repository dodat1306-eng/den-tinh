const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),atlas=JSON.parse(fs.readFileSync(path.join(root,'assets/npcs-v091.json'),'utf8'));
const scope={Image:class{complete=true;naturalWidth=atlas.width},DTNpcPixelAtlas:atlas,DTSettings:{reducedMotion:false},DTV09Content:{relics:[]},DTRenderer:{prototype:{drawNpc(){throw Error('Unexpected NPC fallback')}}}};
vm.createContext(scope);vm.runInContext(fs.readFileSync(path.join(root,'v09-visuals.js'),'utf8'),scope);
let depth=0,paints=0,clip;
const ctx={save(){depth++},restore(){depth--},beginPath(){},ellipse(){},fill(){},fillText(){},drawImage(image,x,y,w,h,...destination){
  assert(clip.cells.some(cell=>cell.x===x&&cell.y===y&&cell.w===w&&cell.h===h),'NPC must use a valid atlas cell');
  assert(destination.every(Number.isFinite));paints++;
}};
const renderer={ctx,game:{time:0}};
for(const [key,current] of Object.entries(atlas.clips)){
  clip=current;
  for(const reduced of [false,true])for(const time of [-.04,-.0001,0,.17,.83,1,1000000]){
    scope.DTSettings.reducedMotion=reduced;renderer.game.time=time;
    scope.DTRenderer.prototype.drawNpc.call(renderer,{type:key.split('/')[0],name:key,x:740,y:2200});
    assert.equal(depth,0,'NPC paint must restore Canvas state');
  }
}
assert.equal(paints,350);
console.log('PASS All 25 NPCs draw valid cells at startup, negative timestamps and reduced motion');
