const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={console,globalThis:null,localStorage:{getItem:()=>null,setItem:()=>{}}};ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of['world.js','content.js','engine.js','expansion.js','frontier.js','elemental.js','mythic-content.js','ascension.js','endless.js','journey.js','v09-content.js','v09.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const V=ctx.DTV09Content;
assert.equal(V.relics.length,32);assert.equal(new Set(V.relics.map(x=>x.id)).size,32);assert.equal(V.relics.filter(x=>x.source==='boss').length,12);assert.equal(V.relics.filter(x=>x.source==='pedestal').length,20);assert.equal(V.npc.length,25);assert.equal(Object.keys(V.stories).length,5);
const g=new ctx.DTGame('an',71426);assert.equal(g.player.nextXp,220);assert.equal(Object.keys(g.player.stats).length,12);assert.equal(g.player.statPoints,2);assert.equal(g.world.relicPedestals.length,20);assert(g.allocateStat('vit'));assert.equal(g.player.maxHp,g.rpgBase.maxHp+32);assert.equal(g.player.statPoints,1);g.addXp(220);assert.equal(g.player.level,2);assert.equal(g.player.statPoints,3);assert.equal(g.skillPoints,4);assert.equal(g.pendingLevels,0);assert.equal(g.player.nextXp,Math.floor(220*Math.pow(2,1.68)+220));
const save=g.serialize(),r=ctx.DTGame.restore(JSON.parse(JSON.stringify(save)));assert.equal(r.player.stats.vit,1);assert.equal(r.player.statPoints,3);assert.equal(r.world.relicPedestals.length,20);
console.log('v0.9 checks passed: 32 relics, 20 pedestals, 12 stats, 25 NPC entries, save migration');
