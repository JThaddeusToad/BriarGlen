const MODULE_ID = "stolen-bell-briar-glen";
const FLAG = "briarGlenCreated";

function marked(doc) { return doc.getFlag(MODULE_ID, FLAG) === true; }

async function makeFolder(name, type) {
  let f = game.folders.find(x => x.name === name && x.type === type && marked(x));
  if (!f) f = await Folder.create({name, type, flags:{[MODULE_ID]:{[FLAG]:true}}});
  return f;
}

async function findSRDActor(name) {
  for (const pack of game.packs) {
    if (pack.documentName !== "Actor") continue;
    try {
      const index = await pack.getIndex({fields:["name"]});
      const hit = index.find(e => e.name === name);
      if (hit) return await pack.getDocument(hit._id);
    } catch (err) {}
  }
  return null;
}

async function cloneNPC(sourceName, newName, hp, folder, note="") {
  let existing = game.actors.find(a => a.name === newName && marked(a));
  if (existing) return existing;
  const src = await findSRDActor(sourceName);
  let data;
  if (src) {
    data = src.toObject();
    delete data._id;
    data.name = newName;
    data.folder = folder.id;
    data.flags = foundry.utils.mergeObject(data.flags ?? {}, {[MODULE_ID]:{[FLAG]:true}}, {inplace:false});
  } else {
    data = {
      name:newName, type:"npc", folder:folder.id,
      system:{
        abilities:{str:{value:10},dex:{value:14},con:{value:10},int:{value:8},wis:{value:10},cha:{value:8}},
        attributes:{hp:{value:hp,max:hp},ac:{flat:13,calc:"flat"},movement:{speeds:{walk:30}}},
        details:{biography:{value:"Fallback actor. SRD source was not found; add attacks manually."}}
      },
      flags:{[MODULE_ID]:{[FLAG]:true}}
    };
  }
  const actor = await Actor.create(data);
  try {
    await actor.update({
      "system.attributes.hp.value":hp,
      "system.attributes.hp.max":hp,
      "system.details.biography.value":`${actor.system?.details?.biography?.value ?? ""}<hr><p>${note}</p>`
    });
  } catch (err) { console.warn(`${MODULE_ID} | NPC override warning`, err); }
  return actor;
}


async function applyActorArt(actor, slug) {
  if (!actor) return actor;
  const portrait = `modules/${MODULE_ID}/assets/actors/portraits/${slug}.webp`;
  const token = `modules/${MODULE_ID}/assets/actors/tokens/${slug}.webp`;
  try {
    await actor.update({
      img: portrait,
      "prototypeToken.texture.src": token,
      "prototypeToken.name": actor.name,
      "prototypeToken.displayName": 20,
      "prototypeToken.displayBars": 20
    });
  } catch (err) {
    console.warn(`${MODULE_ID} | Could not apply art to ${actor.name}`, err);
  }
  return actor;
}

async function makeCivilianNPC(name, slug, folder, biography) {
  let actor = game.actors.find(a => a.name === name && marked(a));
  if (!actor) {
    actor = await Actor.create({
      name,
      type:"npc",
      folder:folder.id,
      img:`modules/${MODULE_ID}/assets/actors/portraits/${slug}.webp`,
      prototypeToken:{
        name,
        texture:{src:`modules/${MODULE_ID}/assets/actors/tokens/${slug}.webp`},
        disposition:1,
        displayName:20,
        displayBars:0
      },
      system:{
        details:{biography:{value:biography}}
      },
      flags:{[MODULE_ID]:{[FLAG]:true}}
    });
  }
  await applyActorArt(actor, slug);
  return actor;
}

async function makeJournal(folder) {
  let j = game.journal.find(x => x.name === "The Stolen Bell of Briar Glen - GM Guide" && marked(x));
  if (j) return j;
  const pages = [
    ["00 - DM Quick Start", `<div class="briar-glen-card"><h2>DM Quick Start</h2><p><b>Party:</b> five player-created level 1 characters.</p><p><b>Goal:</b> recover the Bell of Saint Arlen from goblins at Crooked Fang Cave.</p><p><b>Secret:</b> the goblins stole it because the sound frightens a giant cave spider called Scratch-Scratch.</p><p><b>Run time:</b> 3-4 hours.</p><p>Failed checks create complications, not dead ends.</p></div>`],
    ["01 - Briar Glen", `<h2>Briar Glen</h2><p><b>Read aloud:</b> Morning sunlight spills across the thatched roofs of Briar Glen. Festival ribbons flutter over the square. Then the iron alarm bell begins to ring. Villagers race toward the shrine. Its doors hang broken from their hinges. “The Bell of Saint Arlen is gone!”</p><h3>NPCs</h3><ul><li><b>Reeve Mara Thistlebrook:</b> offers 100 gp total and two healing potions.</li><li><b>Brother Alden:</b> shrine keeper.</li><li><b>Tobbin Reed:</b> saw goblins flee toward Crow's Tooth Hill.</li></ul><h3>Investigation</h3><p>Survival DC 10: 6-8 goblins north. Investigation DC 10: crude tools forced the shrine. Persuasion DC 10 with Tobbin: he heard “Grikka.” Perception DC 10: dropped goblin knife.</p>`],
    ["02 - Forest Trail", `<h2>Forest Trail</h2><p>Lead character makes Survival DC 10. Success: party notices the ambush before it begins. Failure: goblins begin hidden.</p><p><b>Encounter:</b> 3 Beginner Goblins, 5 HP each. When two fall, the survivor surrenders and says: “Grikka take shiny bell! Bell scares Scratch-Scratch!”</p>`],
    ["03 - Crooked Fang Cave", `<h2>Crooked Fang Cave</h2><ol><li><b>Entrance:</b> two sleeping goblins beside cider. Stealth DC 10 or creative bypass.</li><li><b>Alarm:</b> tripwire and cookware. Perception 11; Sleight of Hand 10.</li><li><b>Common Room:</b> 3 goblins arguing about returning the Bell; a 4th is optional reinforcement.</li><li><b>Old Tunnel:</b> scratches and bones. Nature 11 identifies giant spider signs. Brass key in a webbed pouch.</li><li><b>Grikka's Den:</b> Grikka + one goblin if combat occurs. He would rather negotiate.</li><li><b>Old Shrine:</b> Scratch-Scratch + one Giant Rat. Add the second rat only if the party is doing well.</li></ol>`],
    ["04 - Bell & Boss", `<h2>The Bell of Saint Arlen</h2><p>A creature holding the Bell may use an <b>Action</b> to ring it. Scratch-Scratch makes a <b>DC 12 Wisdom save</b>. On a failure it is <b>Frightened of the bell-ringer until the end of its next turn</b>. Once Scratch-Scratch succeeds, it has advantage on later Bell saves.</p><div class="briar-glen-warning"><b>Difficulty dial:</b> If the party struggles, do not introduce the second rat and reduce Scratch-Scratch to 22 HP. If they are cruising, reveal the second rat on round 2.</div>`],
    ["05 - Ending & Treasure", `<h2>Ending</h2><p>Grikka returns the Bell after Scratch-Scratch is defeated. The old shrine chest contains 35 gp, 2 Potions of Healing, a silvered dagger, and the Crowned Raven map.</p><p>Briar Glen pays 100 gp. Advance all five PCs to level 2.</p><h3>Sequel Hook</h3><p>The Crowned Raven map points toward Blackfeather Keep. Beside a sealed chamber is written in Goblin: <b>DO NOT RING THE SECOND BELL.</b></p>`]
  ].map(([name,content]) => ({name,type:"text",text:{content}}));
  return JournalEntry.create({name:"The Stolen Bell of Briar Glen - GM Guide",folder:folder.id,pages,flags:{[MODULE_ID]:{[FLAG]:true}}});
}

async function makeItem(name, folder, description, img="icons/sundries/misc/bell.webp") {
  let item = game.items.find(i => i.name === name && marked(i));
  if (item) return item;
  return Item.create({name,type:"loot",folder:folder.id,img,system:{description:{value:description}},flags:{[MODULE_ID]:{[FLAG]:true}}});
}

function caveWalls() {
  const W=(x1,y1,x2,y2,door=0)=>({c:[x1,y1,x2,y2],move:20,sight:20,light:20,sound:20,door,ds:0});
  return [
    W(1550,2920,1550,2500),W(1550,2500,1800,2350),W(2200,2350,2450,2500),W(2450,2500,2450,2920),W(1550,2920,2450,2920),
    W(1800,2350,1800,1950),W(2200,1950,2200,2350),
    W(1170,1750,1170,1450),W(1170,1450,1400,1280),W(1400,1280,1800,1250),W(2200,1250,2600,1280),W(2600,1280,2700,1450),W(2700,1800,2600,2000),W(2600,2000,2200,2080),W(1800,2080,1400,2000),W(1400,2000,1170,1750),
    W(2700,1450,3400,1450),W(3400,1450,3400,1800),W(3400,1800,2700,1800),
    W(1380,1050,1380,800),W(1380,800,1600,670),W(1600,670,1800,650),W(2200,650,2500,700),W(2500,700,2680,850),W(2680,850,2680,1120),W(2680,1120,2500,1320),W(2500,1320,2200,1350),W(1800,1350,1550,1300),W(1550,1300,1380,1050),
    W(1800,650,1800,500),W(2200,500,2200,650),
    W(1120,420,1120,250),W(1120,250,1350,100),W(1350,100,1800,60),W(2200,60,2700,120),W(2700,120,2880,300),W(2880,300,2880,480),W(2880,480,2700,650),W(2700,650,2200,700),W(1800,700,1350,650),W(1350,650,1120,420),
    W(1800,1100,2200,1100,1)
  ];
}

async function createScene(name,folder,bg,darkness,globalLight,journal,walls=[],lights=[]) {
  let scene=game.scenes.find(s=>s.name===name&&marked(s)); if(scene) return scene;
  scene=await Scene.create({name,folder:folder.id,width:4000,height:3000,background:{src:bg},grid:{type:1,size:100,distance:5,units:"ft"},tokenVision:true,fog:{mode:2,colors:{explored:null,unexplored:null}},environment:{darknessLevel:darkness,darknessLevelLock:true,cycle:false,globalLight:{enabled:globalLight?1:0,bright:!!globalLight}},journal:journal?.id??null,flags:{[MODULE_ID]:{[FLAG]:true}}});
  if(walls.length) await scene.createEmbeddedDocuments("Wall",walls);
  if(lights.length) await scene.createEmbeddedDocuments("AmbientLight",lights);
  return scene;
}

async function putToken(scene,actor,x,y,hidden=true) {
  if(!actor) return;
  try { const td=await actor.getTokenDocument({x,y,hidden}); const data=td.toObject(); delete data._id; await scene.createEmbeddedDocuments("Token",[data]); }
  catch(err){ console.warn(`${MODULE_ID} | token placement failed`,err); }
}


async function makeGMDashboard(folder) {
  let j=game.journal.find(x=>x.name==="Briar Glen - GM Dashboard" && marked(x));
  if (j) return j;
  return JournalEntry.create({
    name:"Briar Glen - GM Dashboard", folder:folder.id,
    pages:[{name:"Run the Session",type:"text",text:{content:`
      <h1>Briar Glen — GM Dashboard</h1>
      <table>
      <tr><th>Phase</th><th>Scene</th><th>Run</th></tr>
      <tr><td>Opening</td><td>TOTM 01 / 01 Briar Glen</td><td>Mara's request → Alden → Tobbin → clues</td></tr>
      <tr><td>Travel</td><td>TOTM 02</td><td>Survival DC 10; success spots ambush</td></tr>
      <tr><td>Ambush</td><td>02 Forest Trail</td><td>3 goblins; last survivor can surrender</td></tr>
      <tr><td>Cave</td><td>TOTM 03 / 03 Cave</td><td>Shared fog; darkness; reveal hidden tokens as discovered</td></tr>
      <tr><td>Parley</td><td>TOTM 04</td><td>Grikka explains Scratch-Scratch and bargains for help</td></tr>
      <tr><td>Reveal</td><td>TOTM 05 → TOTM 06</td><td>Show shrine, then spider; switch back to tactical cave</td></tr>
      <tr><td>Finale</td><td>03 Cave</td><td>Spider + 1 rat; second rat only if needed</td></tr>
      <tr><td>Return</td><td>TOTM 07</td><td>100 gp reward; level 2; second Bell hook</td></tr>
      </table>
      <h2>Difficulty Dials</h2>
      <p><b>Easier:</b> Scratch-Scratch 22 HP; no second rat; goblins surrender early.</p>
      <p><b>Standard:</b> Scratch-Scratch 30 HP + 1 rat.</p>
      <p><b>Harder:</b> add second rat on round 2.</p>
      <h2>Bell</h2>
      <p>Action → Scratch-Scratch DC 12 Wisdom save → failure: Frightened of bell-ringer until end of its next turn. After first successful Bell save, advantage on later Bell saves.</p>
      <h2>Quick DCs</h2>
      <p>Tracks 10 • Shrine investigation 10 • Tobbin persuasion 10 • Knife perception 10 • Alarm perception 11 • Alarm disarm 10 • Spider signs Nature 11.</p>
    `}}],
    flags:{[MODULE_ID]:{[FLAG]:true}}
  });
}

async function makeMacro(name, command, img="icons/svg/dice-target.svg") {
  let m=game.macros.find(x=>x.name===name && marked(x));
  if (m) return m;
  return Macro.create({name,type:"script",command,img,flags:{[MODULE_ID]:{[FLAG]:true}}});
}

async function makeGMTools() {
  await makeMacro("BG - Reveal Selected Tokens",
    `const toks=canvas.tokens.controlled; if(!toks.length)return ui.notifications.warn("Select token(s) first."); await canvas.scene.updateEmbeddedDocuments("Token",toks.map(t=>({_id:t.id,hidden:false})));`);
  await makeMacro("BG - Hide Selected Tokens",
    `const toks=canvas.tokens.controlled; if(!toks.length)return ui.notifications.warn("Select token(s) first."); await canvas.scene.updateEmbeddedDocuments("Token",toks.map(t=>({_id:t.id,hidden:true})));`);
  await makeMacro("BG - Ring the Bell",
    `const target=[...game.user.targets][0]; if(!target)return ui.notifications.warn("Target Scratch-Scratch first."); ChatMessage.create({content:"<h2>🔔 The Bell of Saint Arlen Rings!</h2><p>Scratch-Scratch must make a <b>DC 12 Wisdom saving throw</b>. On a failure it is <b>Frightened of the bell-ringer until the end of its next turn</b>. After its first successful Bell save, it has advantage on later Bell saves.</p>"});`);
  await makeMacro("BG - Easy Boss",
    `const a=game.actors.getName("Scratch-Scratch"); if(!a)return ui.notifications.warn("Scratch-Scratch not found."); await a.update({"system.attributes.hp.value":22,"system.attributes.hp.max":22}); ui.notifications.info("Scratch-Scratch set to 22 HP.");`);
  await makeMacro("BG - Standard Boss",
    `const a=game.actors.getName("Scratch-Scratch"); if(!a)return ui.notifications.warn("Scratch-Scratch not found."); await a.update({"system.attributes.hp.value":30,"system.attributes.hp.max":30}); ui.notifications.info("Scratch-Scratch set to 30 HP.");`);
  await makeMacro("BG - Reset Fog",
    `if(!canvas.scene)return; await canvas.scene.resetFog(); ui.notifications.info("Fog reset for current scene.");`,
    "icons/svg/fog.svg");
}

async function addCaveHazards(scene, journal) {
  if (!scene) return;
  // A secret GM marker for the alarm tripwire and a treasure marker.
  const existing=scene.notes ?? [];
  const wanted=[
    {x:2000,y:2180,text:"⚠ Alarm Tripwire — Perception 11 / Sleight of Hand 10"},
    {x:3020,y:1600,text:"🔑 Webbed pouch — brass key"},
    {x:2050,y:360,text:"💰 Old Shrine Chest — 35 gp + 2 healing potions + silvered dagger + map"}
  ];
  const create=wanted.filter(w=>!existing.some(n=>n.text===w.text))
    .map(n=>({x:n.x,y:n.y,entryId:journal.id,text:n.text,icon:"icons/svg/hazard.svg"}));
  if(create.length) try{await scene.createEmbeddedDocuments("Note",create);}catch(err){console.warn(err);}
}


async function makePlaylist(name, filename, volume=0.25) {
  let p=game.playlists.find(x=>x.name===name && marked(x));
  if (p) return p;
  p=await Playlist.create({
    name, mode:0,
    flags:{[MODULE_ID]:{[FLAG]:true}}
  });
  try {
    await p.createEmbeddedDocuments("PlaylistSound",[{
      name,
      path:`modules/${MODULE_ID}/assets/audio/${filename}`,
      repeat:true,
      volume
    }]);
  } catch(err){console.warn(`${MODULE_ID} | Could not add sound ${name}`,err);}
  return p;
}

async function makeAudioSuite() {
  return {
    village:await makePlaylist("BG - Village & Festival","village-ambience.wav",0.22),
    forest:await makePlaylist("BG - Forest","forest-ambience.wav",0.20),
    cave:await makePlaylist("BG - Cave","cave-ambience.wav",0.20),
    boss:await makePlaylist("BG - Scratch-Scratch","boss-tension.wav",0.24),
    victory:await makePlaylist("BG - Victory","victory-ambience.wav",0.22)
  };
}

async function makeSceneChatMacro(name, sceneName, html) {
  return makeMacro(name,
    `const s=game.scenes.getName(${JSON.stringify(sceneName)}); if(s) await s.activate(); ChatMessage.create({content:${JSON.stringify(html)}});`,
    "icons/svg/book.svg");
}

async function makeTransitionMacros() {
  await makeSceneChatMacro("BG - Opening","TOTM 01 - Briar Glen Arrival",
    `<h2>The Stolen Bell of Briar Glen</h2><p>Morning sunlight spills across the thatched roofs of Briar Glen. Festival ribbons flutter over the square. Then the iron alarm bell begins to ring...</p>`);
  await makeSceneChatMacro("BG - Journey to Crow's Tooth","TOTM 02 - Crow's Tooth Hill",
    `<h2>Toward Crow's Tooth Hill</h2><p>The village road narrows into a woodland trail. Ahead, the jagged silhouette of Crow's Tooth rises above the trees.</p>`);
  await makeSceneChatMacro("BG - Enter the Cave","TOTM 03 - Cave Interior",
    `<h2>Crooked Fang Cave</h2><p>Cool air breathes from the black opening. Somewhere inside, water drips with slow, patient regularity.</p>`);
  await makeSceneChatMacro("BG - Grikka Parley","TOTM 04 - Grikka's Parley",
    `<h2>Grikka One-Ear</h2><p>The goblin in the cooking-pot helmet raises both hands. “Wait! Wait! You want Bell? We talk first.”</p>`);
  await makeSceneChatMacro("BG - Shrine Reveal","TOTM 05 - The Old Shrine",
    `<h2>The Old Shrine</h2><p>Worked stone emerges from the natural cave. Candles gutter around a cracked altar, and thick webs vanish into the darkness overhead.</p>`);
  await makeSceneChatMacro("BG - Scratch-Scratch Reveal","TOTM 06 - Scratch-Scratch Revealed",
    `<h2>Scratch-Scratch</h2><p>A shape unfolds above you. Too many legs. Too many eyes. The web trembles—and something enormous drops toward the shrine floor.</p>`);
  await makeSceneChatMacro("BG - Finale","TOTM 07 - Triumph in Briar Glen",
    `<h2>The Bell Returns</h2><p>The silver Bell rings over Briar Glen once more. Cheers roll across the village green as festival ribbons lift in the evening breeze.</p>`);
}

async function makeAudioMacros() {
  const names=["BG - Village & Festival","BG - Forest","BG - Cave","BG - Scratch-Scratch","BG - Victory"];
  for(const n of names){
    await makeMacro(`Play ${n}`,`const p=game.playlists.getName(${JSON.stringify(n)}); if(p) await p.playAll();`,"icons/svg/sound.svg");
  }
  await makeMacro("BG - Stop All Audio",`for(const p of game.playlists.filter(p=>p.playing)) await p.stopAll();`,"icons/svg/mute.svg");
}


async function makeExplorationMacros() {
  await makeMacro("BG - Tripwire Discovered",
    `ChatMessage.create({content:"<h2>⚠ Alarm Tripwire</h2><p>A thin cord crosses the passage at ankle height, tied to a precarious collection of pots and pans.</p><p><b>Perception DC 11</b> to notice before triggering. <b>Sleight of Hand DC 10</b> to disable quietly. Creative solutions work.</p>"});`);
  await makeMacro("BG - Tripwire Triggered",
    `ChatMessage.create({content:"<h2>CLANG! CLATTER! CRASH!</h2><p>The cave erupts with the sound of falling cookware. Goblins in the common room are alerted and cannot be surprised.</p>"});`);
  await makeMacro("BG - Search Webbed Pouch",
    `ChatMessage.create({content:"<h2>🕸 Webbed Pouch</h2><p>Behind the old bones is a leather pouch wrapped in sticky web. Inside are <b>8 sp and a tiny brass key</b>.</p>"});`);
  await makeMacro("BG - Open Shrine Chest",
    `ChatMessage.create({content:"<h2>🗝 The Old Shrine Chest</h2><p>The brass key turns with a dry click.</p><p><b>Treasure:</b> 35 gp, 2 Potions of Healing, a silvered dagger, and an old map marked with a crowned raven.</p>"});`);
  await makeMacro("BG - Goblin Surrenders",
    `ChatMessage.create({content:"<h2>The Goblin Drops Its Weapon</h2><p>“No more! No more! Grikka take shiny Bell! Bell scares Scratch-Scratch!”</p>"});`);
  await makeMacro("BG - Reveal Second Rat",
    `const s=game.scenes.getName("03 - Crooked Fang Cave"); if(!s)return; const rats=s.tokens.filter(t=>t.name?.includes("Giant Rat")); const hidden=rats.find(t=>t.hidden); if(hidden){await s.updateEmbeddedDocuments("Token",[{_id:hidden.id,hidden:false}]); ui.notifications.info("Second rat revealed.");} else ui.notifications.info("No hidden rat found.");`);
}

async function makeRoomJournals(folder) {
  const rooms=[
    ["ROOM 1 - Cave Entrance",`<h1>1. Cave Entrance</h1><p>Two goblins doze near stolen cider and supplies. A crude sign reads: <b>NO HUMANS / NO DWARFS / NO BIG DOGS / SMALL DOGS MAYBE</b>.</p><p>Stealth DC 10 or any sensible distraction/bypass can avoid combat.</p>`],
    ["ROOM 2 - Alarm Trap",`<h1>2. Alarm Trap</h1><p>Tripwire attached to pots and pans. <b>Perception 11</b>; <b>Sleight of Hand 10</b>. Triggering it alerts the Common Room.</p>`],
    ["ROOM 3 - Goblin Common Room",`<h1>3. Common Room</h1><p>Three goblins argue about returning the Bell. They can be fought, intimidated, persuaded, or overheard. A fourth goblin is optional reinforcement.</p>`],
    ["ROOM 4 - Old Tunnel",`<h1>4. Old Tunnel</h1><p>Deep scratches, bones, and increasing webbing. <b>Nature 11</b> identifies signs of a very large spider. Search reveals the webbed pouch: 8 sp + brass key.</p>`],
    ["ROOM 5 - Grikka's Den",`<h1>5. Grikka's Den</h1><p>Grikka wears a cooking-pot helmet and keeps the Bell close. He prefers a bargain: kill Scratch-Scratch and he returns the Bell.</p>`],
    ["ROOM 6 - Old Shrine",`<h1>6. Old Shrine</h1><p>Ancient worked stone, cracked altar, heavy webs. Scratch-Scratch waits here. Start with one Giant Rat; reveal the second only if needed.</p><p>The keyed chest holds the adventure treasure and sequel map.</p>`]
  ];
  const out={};
  for(const [name,content] of rooms){
    let j=game.journal.find(x=>x.name===name && marked(x));
    if(!j) j=await JournalEntry.create({name,folder:folder.id,pages:[{name,type:"text",text:{content}}],flags:{[MODULE_ID]:{[FLAG]:true}}});
    out[name]=j;
  }
  return out;
}

async function addRoomPins(scene, rooms) {
  if(!scene) return;
  const pins=[
    [2000,2650,"ROOM 1 - Cave Entrance"],
    [2000,2150,"ROOM 2 - Alarm Trap"],
    [1900,1650,"ROOM 3 - Goblin Common Room"],
    [3000,1600,"ROOM 4 - Old Tunnel"],
    [2000,900,"ROOM 5 - Grikka's Den"],
    [2000,320,"ROOM 6 - Old Shrine"]
  ];
  const data=[];
  for(const [x,y,name] of pins){
    const j=rooms[name]; if(!j)continue;
    if(scene.notes.some(n=>n.text===name))continue;
    data.push({x,y,entryId:j.id,text:name,icon:"icons/svg/book.svg"});
  }
  if(data.length) try{await scene.createEmbeddedDocuments("Note",data);}catch(err){console.warn(err);}
}


async function createTheaterScene(name, filename) {
  let s = game.scenes.find(x => x.name === name && marked(x));
  if (s) return s;
  return Scene.create({
    name,
    width:1920,
    height:1080,
    padding:0,
    grid:{type:0,size:100,distance:5,units:"ft"},
    background:{src:`modules/${MODULE_ID}/assets/theater/${filename}`},
    tokenVision:false,
    fog:{mode:0},
    environment:{darknessLevel:0,globalLight:{enabled:true}},
    flags:{[MODULE_ID]:{[FLAG]:true,theater:true}}
  });
}

async function installAdventure() {
  if(!game.user.isGM) return ui.notifications.warn("Only a GM can install Briar Glen content.");
  if(game.system.id!=="dnd5e") return ui.notifications.error("This adventure requires D&D5e.");

  // Theater-of-the-mind scenes
  await createTheaterScene("TOTM 01 - Briar Glen Arrival","totm-briar-glen.jpg");
  await createTheaterScene("TOTM 02 - Crow's Tooth Hill","totm-crows-tooth.jpg");
  await createTheaterScene("TOTM 03 - Cave Interior","totm-cave-interior.jpg");
  await createTheaterScene("TOTM 04 - Grikka's Parley","totm-campfire.jpg");
  await createTheaterScene("TOTM 05 - The Old Shrine","totm-old-shrine.jpg");
  await createTheaterScene("TOTM 06 - Scratch-Scratch Revealed","totm-scratch-scratch.jpg");
  await createTheaterScene("TOTM 07 - Triumph in Briar Glen","totm-triumph.jpg");

  ui.notifications.info("Installing Briar Glen content...");
  const sceneFolder=await makeFolder("Briar Glen - Scenes","Scene");
  const actorFolder=await makeFolder("Briar Glen - NPCs & Monsters","Actor");
  const journalFolder=await makeFolder("Briar Glen - GM Guide","JournalEntry");
  const itemFolder=await makeFolder("Briar Glen - Items","Item");
  const journal=await makeJournal(journalFolder);
  await makeItem("Bell of Saint Arlen",itemFolder,`<p><b>Adventure Relic.</b> A silver handbell sacred to Briar Glen.</p><p><b>Ring the Bell (Action):</b> Scratch-Scratch makes a DC 12 Wisdom saving throw. On a failure it is Frightened of the bell-ringer until the end of its next turn. After it succeeds once, it has advantage on later saves.</p>`);
  await makeItem("Crowned Raven Map",itemFolder,`<p>An old map bearing the crowned-raven mark. It points toward Blackfeather Keep and bears a Goblin warning: <b>DO NOT RING THE SECOND BELL.</b></p>`,`modules/${MODULE_ID}/assets/handouts/crowned-raven-map.png`);
  let party=game.actors.find(a=>a.name==="Briar Glen Adventuring Party"&&marked(a));
  if(!party){ try{party=await Actor.create({name:"Briar Glen Adventuring Party",type:"group",folder:actorFolder.id,flags:{[MODULE_ID]:{[FLAG]:true}}});}catch(err){console.warn(`${MODULE_ID} | group actor warning`,err);} }
  const goblin=await cloneNPC("Goblin","Beginner Goblin",5,actorFolder,"Beginner version: use imperfect tactics. Flee or surrender when appropriate.");
  const grikka=await cloneNPC("Goblin","Grikka One-Ear",16,actorFolder,"Goblin leader. Prefers negotiation. Surrenders at 5 HP or fewer unless Scratch-Scratch is present.");
  const rat=await cloneNPC("Giant Rat","Giant Rat - Briar Glen",5,actorFolder,"Use one in the final fight; reveal a second only if the party is doing well.");
  const spider=await cloneNPC("Giant Spider","Scratch-Scratch",30,actorFolder,"Bell weakness: DC 12 Wisdom save or Frightened of bell-ringer until end of next turn. After first successful save, advantage on later Bell saves.");
  const village=await createScene("01 - Briar Glen",sceneFolder,`modules/${MODULE_ID}/assets/maps/briar-glen.png`,0.10,true,journal,[],[{name:"Shrine daylight",x:2000,y:2200,walls:true,vision:false,config:{bright:5,dim:12,color:"#f3d99b"}}]);
  const forest=await createScene("02 - Forest Trail",sceneFolder,`modules/${MODULE_ID}/assets/maps/forest-trail.png`,0.18,true,journal,[],[]);
  const cave=await createScene("03 - Crooked Fang Cave",sceneFolder,`modules/${MODULE_ID}/assets/maps/crooked-fang-cave.png`,0.88,false,journal,caveWalls(),[
    {name:"Common-room fire",x:1950,y:1680,walls:true,vision:false,config:{bright:3,dim:8,color:"#e59a4b"}},
    {name:"Grikka lantern",x:2050,y:900,walls:true,vision:false,config:{bright:2,dim:6,color:"#e7b66b"}},
    {name:"Entrance daylight spill",x:2000,y:2700,walls:true,vision:false,config:{bright:3,dim:7,color:"#c8d6bd"}}
  ]);
  await putToken(forest,goblin,2500,1050,true); await putToken(forest,goblin,3050,900,true); await putToken(forest,goblin,2230,1300,true);
  await putToken(cave,goblin,1750,2600,true); await putToken(cave,goblin,2250,2600,true); await putToken(cave,goblin,1550,1550,true); await putToken(cave,goblin,1950,1450,true); await putToken(cave,goblin,2350,1700,true); await putToken(cave,goblin,2450,950,true);
  await putToken(cave,grikka,2000,850,true); await putToken(cave,spider,2000,330,true); await putToken(cave,rat,1600,420,true); await putToken(cave,rat,2450,400,true);
  try {
    const notes=[[2000,2650,"1 - Entrance"],[2000,2150,"2 - Alarm Trap"],[1900,1650,"3 - Common Room"],[3000,1600,"4 - Old Tunnel"],[2000,900,"5 - Grikka's Den"],[2000,320,"6 - Old Shrine"]].map(([x,y,text])=>({x,y,entryId:journal.id,text,icon:"icons/svg/book.svg"}));
    await cave.createEmbeddedDocuments("Note",notes);
  } catch(err){console.warn(`${MODULE_ID} | map note warning`,err);}
  ui.notifications.info("Briar Glen installed. Add your five PCs later; no player characters were created or modified.");
  await village.activate();
}

Hooks.once("init",()=>{ const mod=game.modules.get(MODULE_ID); if(mod) mod.api={installAdventure}; });
Hooks.once("ready",async()=>{
  if(!game.user.isGM) return;
  if(!game.macros.find(m=>m.name==="Briar Glen - Install Adventure")) {
    await Macro.create({name:"Briar Glen - Install Adventure",type:"script",command:`await game.modules.get("${MODULE_ID}").api.installAdventure();`,img:"icons/svg/house.svg",flags:{[MODULE_ID]:{[FLAG]:true}}});
    ui.notifications.info("Briar Glen: run the 'Briar Glen - Install Adventure' macro once.");
  }
});
