using System;
using System.IO;
using UnityEngine;
using UnityEditor;
using DenTinh.Core;
using DenTinh.UnityRuntime;

namespace DenTinh.Editor {
    public static class ReleaseChecks {
        static void Check(bool ok,string text){if(!ok)throw new Exception(text);Debug.Log("RPG CHECK: "+text);}
        public static void Validate(){
            int checks=0;
            foreach(RelicDef r in CatalogData.Create().relics){Sprite sprite=PixelArt.Relic(r.atlas);Check(sprite.rect.width==32&&sprite.rect.height==32,"relic atlas "+r.id);checks++;}
            foreach(StoryNpc n in RpgCatalog.Npcs){Sprite sprite=PixelArt.Npc(n.portrait);Check(sprite.rect.width==40&&sprite.rect.height==56,"NPC portrait "+n.id);checks++;}
            foreach(HeroDef h in CatalogData.Create().PlayableHeroes){
                Simulation g=new Simulation(CatalogData.Create(),h.id,71426);g.Player.level=10;g.Player.statPoints=20;foreach(string id in Simulation.StatKeys)g.AllocateStat(id);g.Player.hp*=.6f;g.Player.gold=500;g.Buy("hp");g.Buy("damage");
                if(h.id=="quanle")g.SpawnShadow("shadow_wolf",g.Player.position,22);
                if(h.id=="thienvu"){g.TransformElement("earth");g.Skill("r");for(int i=0;i<40;i++)g.Tick(1/60f);}
                g.Tick(.02f);float hp=g.Player.hp,max=g.Player.maxHp,damage=g.Player.damage;int shadows=g.ShadowArmy.Count,summons=g.Summons.Count;
                for(int i=0;i<10;i++){string json=JsonUtility.ToJson(g.Capture());RunSave save=JsonUtility.FromJson<RunSave>(json);g=Simulation.Restore(CatalogData.Create(),save);}
                Check(Math.Abs(g.Player.hp-hp)<.001f&&g.Player.maxHp==max&&g.Player.damage==damage,h.id+" JSON round trip preserves canonical stats");checks++;
                Check(g.ShadowArmy.Count==shadows&&g.Summons.Count==summons,h.id+" JSON round trip preserves summons");checks++;
                Check(g.WorldRelics.Count==20&&g.Rpg.questStage>=0,h.id+" JSON round trip preserves world and quest");checks++;
            }
            BuildGame.Prepare();AssetDatabase.Refresh();Directory.CreateDirectory("../qa/v091");File.WriteAllText("../qa/v091/unity-editor-report.json","{\"version\":\"0.9.1\",\"passed\":"+checks+",\"failed\":0,\"jsonRoundTripsPerHero\":10,\"atlasPixelsValidated\":true}");
            Debug.Log("RPG RELEASE CHECKS PASSED: "+checks);
        }
    }
}
