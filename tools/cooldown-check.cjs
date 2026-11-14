const assert=require('node:assert/strict');
exports.track=g=>{
  const skill=g.skill;
  g.skill=function(key){const ok=skill.call(this,key);if(ok&&key==='r')this.expectedREnd=this.time+this.player.cd.r;return ok};
  return g;
};
exports.check=(g,label='R cooldown changed by combat')=>{
  const expected=Math.max(0,(g.expectedREnd??g.time)-g.time);
  assert(Math.abs(g.player.cd.r-expected)<1e-7,label);
};
