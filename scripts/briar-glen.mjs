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
    ["00 - DM Quick Start", `<div class="briar-glen-card"><h2>DM Quick Start</h2><p><b>Party:</b> four player-created level 1 characters.</p><p><b>Goal:</b> recover the Bell of Saint Arlen from goblins at Crooked Fang Cave.</p><p><b>Secret:</b> the goblins stole it because the sound frightens a giant cave spider called Scratch-Scratch.</p><p><b>Run time:</b> 3-4 hours.</p><p>Failed checks create complications, not dead ends.</p></div>`],
    ["01 - Briar Glen", `<h2>Briar Glen</h2><p><b>Read aloud:</b> Morning sunlight spills across the thatched roofs of Briar Glen. Festival ribbons flutter over the square. Then the iron alarm bell begins to ring. Villagers race toward the shrine. Its doors hang broken from their hinges. “The Bell of Saint Arlen is gone!”</p><h3>NPCs</h3><ul><li><b>Reeve Mara Thistlebrook:</b> offers 100 gp total and two healing potions.</li><li><b>Brother Alden:</b> shrine keeper.</li><li><b>Tobbin Reed:</b> saw goblins flee toward Crow's Tooth Hill.</li></ul><h3>Investigation</h3><p>Survival DC 10: 6-8 goblins north. Investigation DC 10: crude tools forced the shrine. Persuasion DC 10 with Tobbin: he heard “Grikka.” Perception DC 10: dropped goblin knife.</p>`],
    ["02 - Forest Trail", `<h2>Forest Trail</h2><p>Lead character makes Survival DC 10. Success: party notices the ambush before it begins. Failure: goblins begin hidden.</p><p><b>Encounter:</b> 3 Beginner Goblins, 5 HP each. When two fall, the survivor surrenders and says: “Grikka take shiny bell! Bell scares Scratch-Scratch!”</p>`],
    ["03 - Crooked Fang Cave", `<h2>Crooked Fang Cave</h2><ol><li><b>Entrance:</b> two sleeping goblins beside cider. Stealth DC 10 or creative bypass.</li><li><b>Alarm:</b> tripwire and cookware. Perception 11; Sleight of Hand 10.</li><li><b>Common Room:</b> 3 goblins arguing about returning the Bell; a 4th is optional reinforcement.</li><li><b>Old Tunnel:</b> scratches and bones. Nature 11 identifies giant spider signs. Brass key in a webbed pouch.</li><li><b>Grikka's Den:</b> Grikka + one goblin if combat occurs. He would rather negotiate.</li><li><b>Old Shrine:</b> Scratch-Scratch + one Giant Rat. Add the second rat only if the party is doing well.</li></ol>`],
    ["04 - Bell & Boss", `<h2>The Bell of Saint Arlen</h2><p>A creature holding the Bell may use an <b>Action</b> to ring it. Scratch-Scratch makes a <b>DC 12 Wisdom save</b>. On a failure it is <b>Frightened of the bell-ringer until the end of its next turn</b>. Once Scratch-Scratch succeeds, it has advantage on later Bell saves.</p><div class="briar-glen-warning"><b>Difficulty dial:</b> If the party struggles, do not introduce the second rat and reduce Scratch-Scratch to 22 HP. If they are cruising, reveal the second rat on round 2.</div>`],
    ["05 - Ending & Treasure", `<h2>Ending</h2><p>Grikka returns the Bell after Scratch-Scratch is defeated. The old shrine chest contains 35 gp, 2 Potions of Healing, a silvered dagger, and the Crowned Raven map.</p><p>Briar Glen pays 100 gp. Advance all four PCs to level 2.</p><h3>Sequel Hook</h3><p>The Crowned Raven map points toward Blackfeather Keep. Beside a sealed chamber is written in Goblin: <b>DO NOT RING THE SECOND BELL.</b></p>`]
  ].map(([name,content]) => ({name,type:"text",text:{content}}));
  return JournalEntry.create({name:"The Stolen Bell of Briar Glen - GM Guide",folder:folder.id,pages,flags:{[MODULE_ID]:{[FLAG]:true}}});
}


async function makePlayerHandouts(folder) {
  const defs=[
    ["HANDOUT - Reeve Mara's Request",`
      <h1>Reeve Mara's Request</h1>
      <p>The sacred <b>Bell of Saint Arlen</b> was stolen from Briar Glen's shrine during the Harvest Festival.</p>
      <p><b>Reeve Mara Thistlebrook</b> asks you to recover it before panic spreads through the village.</p>
      <p><b>Reward:</b> 100 gp for the party, plus lodging and the village's gratitude.</p>`],
    ["HANDOUT - Tobbin's Account",`
      <h1>Tobbin's Account</h1>
      <p>“I saw little shapes running north. Goblins, I think! One of them carried something wrapped in cloth. I heard one of them shout <b>Grikka</b> before they disappeared toward Crow's Tooth Hill.”</p>`],
    ["HANDOUT - The Bell of Saint Arlen",`
      <h1>The Bell of Saint Arlen</h1>
      <p>A silver handbell sacred to Briar Glen. The villagers say its clear tone once drove darkness from the valley.</p>
      <p><b>In the final confrontation:</b> a creature holding the Bell can use an Action to ring it. Scratch-Scratch must make a DC 12 Wisdom save or become Frightened of the bell-ringer until the end of its next turn. After its first successful Bell save, it has advantage on later saves.</p>`],
    ["HANDOUT - Crowned Raven Map",`
      <h1>The Crowned Raven Map</h1>
      <p>An old, weathered map marked with a crowned raven. A route leads toward a place identified as <b>Blackfeather Keep</b>.</p>
      <p><img src="modules/${MODULE_ID}/assets/handouts/crowned-raven-map.png" style="max-width:100%;height:auto"></p>
      <p>Near a sealed chamber, someone has written in Goblin: <b>DO NOT RING THE SECOND BELL.</b></p>`],
    ["HANDOUT - What We Know",`
      <h1>What We Know</h1>
      <ul>
        <li>The Bell of Saint Arlen was stolen during the Harvest Festival.</li>
        <li>Tracks and eyewitness reports point toward Crow's Tooth Hill.</li>
        <li>The thieves appear to be goblins.</li>
        <li>The name “Grikka” may belong to their leader.</li>
      </ul>`],
    ["HANDOUT - Exploring in Darkness",`
      <h1>Exploring in Darkness</h1>
      <p>Crooked Fang Cave is genuinely dark. Characters without darkvision will need a light source to see.</p>
      <p>Stay close to companions, announce what light source you are carrying, and remember that bright light can reveal your position.</p>`],
    ["HANDOUT - Goblin's Warning",`
      <h1>Goblin's Warning</h1>
      <p>“Bell scares Scratch-Scratch! Big spider came into old shrine. Grikka took shiny bell so we could make it go away. We don't want your village. We want our cave back!”</p>`]
  ];
  const made={};
  for(const [name,content] of defs){
    let j=game.journal.find(x=>x.name===name && marked(x));
    if(!j){
      j=await JournalEntry.create({
        name,folder:folder.id,
        ownership:{default:0},
        pages:[{name:name.replace("HANDOUT - ",""),type:"text",text:{content}}],
        flags:{[MODULE_ID]:{[FLAG]:true,playerHandout:true}}
      });
    } else {
      await j.update({ownership:{default:0}});
    }
    made[name]=j;
  }
  return made;
}

async function makeGMQuickStart(folder) {
  const name="GM QUICK START - The Stolen Bell of Briar Glen";
  let j=game.journal.find(x=>x.name===name && marked(x));
  const content=`<h1>The Stolen Bell of Briar Glen — GM Quick Start</h1>
  <p><b>Recommended party for this session:</b> four level-1 characters. Three supplied PCs are installed automatically; add the fourth PC when its sheet is available. <b>Expected length:</b> 3–4 hours.</p>
  <h2>Adventure Flow</h2>
  <ol>
    <li><b>Briar Glen Arrival:</b> festival disrupted; Reeve Mara asks the party to recover the Bell.</li>
    <li><b>Investigation:</b> speak with Mara, Brother Alden, and Tobbin. Most checks are DC 10 and should fail forward.</li>
    <li><b>Forest Trail:</b> reveal the three Beginner Goblins and run the ambush.</li>
    <li><b>Crooked Fang Cave:</b> alarm tripwire, goblin common area, Grikka's parley, old shrine.</li>
    <li><b>Boss:</b> Scratch-Scratch + 1 Giant Rat. Use the second rat only if the party is cruising.</li>
    <li><b>Return:</b> play the Victory scene/audio and award level 2 by milestone.</li>
  </ol>
  <h2>Key DCs</h2>
  <p>Investigation checks are generally <b>DC 10</b>. Alarm tripwire: <b>Perception DC 11</b> to notice and <b>Sleight of Hand DC 10</b> to disable.</p>
  <h2>The Bell of Saint Arlen</h2>
  <p>Target Scratch-Scratch, then run <b>BG - Ring the Bell</b>. Scratch-Scratch makes a <b>DC 12 Wisdom saving throw</b>. On a failure it is frightened of the bell-ringer until the end of its next turn. After its first successful Bell save, it has advantage on later Bell saves.</p>
  <h2>Boss Difficulty</h2>
  <p><b>Four-player baseline:</b> run <b>BG - Easy Boss</b> for Scratch-Scratch at 22 HP + 1 rat. <b>Harder:</b> use <b>BG - Standard Boss</b> for 30 HP. Reveal the second rat only if the party is cruising.</p>
  <h2>Useful Macros</h2>
  <p><b>Reveal/Hide Selected Tokens</b>, <b>Goblin Surrenders</b>, <b>Tripwire Discovered/Triggered</b>, <b>Search Webbed Pouch</b>, <b>Open Shrine Chest</b>, <b>Ring the Bell</b>, scene transitions, and audio controls are all prefixed <b>BG -</b> or <b>Play BG -</b>.</p>
  <h2>Player Handouts</h2>
  <p>Player handouts are created GM-only by default. Share them individually when appropriate.</p>
  <h2>End of Adventure</h2>
  <p>Treasure: 35 gp, 2 healing potions, a silvered dagger, and the Crowned Raven Map. The party reaches <b>level 2</b>. The map points toward Blackfeather Keep and the warning: <b>DO NOT RING THE SECOND BELL.</b></p>`;
  if(!j){
    j=await JournalEntry.create({
      name,
      folder:folder?.id,
      ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},
      flags:{[MODULE_ID]:{[FLAG]:true}}
    });
    await j.createEmbeddedDocuments("JournalEntryPage",[{
      name:"Quick Start",
      type:"text",
      text:{content,format:1}
    }]);
  } else {
    const page=j.pages?.contents?.[0];
    if(page) await page.update({"text.content":content});
  }
  return j;
}


async function makeItem(name, folder, description, img="icons/sundries/misc/bell.webp") {
  let item = game.items.find(i => i.name === name && marked(i));
  if (item) return item;
  return Item.create({name,type:"loot",folder:folder.id,img,system:{description:{value:description}},flags:{[MODULE_ID]:{[FLAG]:true}}});
}

function wallSeg(x1,y1,x2,y2,door=0,geometry="v0.7.6") {
  return {c:[x1,y1,x2,y2],move:20,sight:20,light:20,sound:20,door,ds:0,
    flags:{[MODULE_ID]:{[FLAG]:true,geometry}}};
}

function polyWalls(points, geometry="v0.7.6") {
  const out=[];
  for(let i=0;i<points.length-1;i++) out.push(wallSeg(...points[i],...points[i+1],0,geometry));
  return out;
}

function villageWalls() {
  const G="v0.7.8-village";
  const out=[];

  // Reeve's House.
  out.push(...polyWalls([[650,300],[1160,190],[1390,420],[1370,760]],G));
  out.push(...polyWalls([[1370,760],[1180,990],[910,1010]],G));
  out.push(...polyWalls([[760,970],[610,760],[650,300]],G));

  // The Gilded Stag.
  out.push(...polyWalls([[1660,120],[2200,70],[2480,250],[2470,620]],G));
  out.push(...polyWalls([[2470,620],[2300,760],[2080,760]],G));
  out.push(...polyWalls([[1940,760],[1690,650],[1660,120]],G));

  // Blacksmith.
  out.push(...polyWalls([[2890,390],[3330,330],[3490,520],[3460,920]],G));
  out.push(...polyWalls([[3460,920],[3190,1040],[3010,960]],G));
  out.push(...polyWalls([[2900,830],[2860,590],[2890,390]],G));

  // Shrine of Saint Arlen.
  out.push(...polyWalls([[2900,1480],[3220,1450],[3460,1660],[3450,2130]],G));
  out.push(...polyWalls([[3450,2130],[3260,2310],[3070,2300]],G));
  out.push(...polyWalls([[2940,2260],[2830,2110],[2840,1680],[2900,1480]],G));

  // South-east house.
  out.push(...polyWalls([[3450,2150],[3790,2090],[3990,2280]],G));
  out.push(...polyWalls([[3990,2280],[3990,2700],[3780,2790]],G));
  out.push(...polyWalls([[3610,2720],[3440,2500],[3450,2150]],G));

  // Deliberately no river-bank or label-adjacent walls.
  // Town Gate and market-to-shrine roads remain fully traversable.
  return out;
}

function forestWalls() {
  const out=[];
  const G="v0.7.6-forest";

  // Stream banks. The bridge span is intentionally left open.
  out.push(...polyWalls([[1450,0],[1570,260],[1710,520],[1850,760],[1900,930]],G));
  out.push(...polyWalls([[1950,1390],[2060,1640],[2180,1900],[2320,2210],[2440,2500],[2580,3000]],G));
  out.push(...polyWalls([[2050,0],[2110,300],[2190,580],[2310,820],[2380,950]],G));
  out.push(...polyWalls([[2450,1390],[2520,1660],[2620,1940],[2730,2200],[2820,2500],[2940,3000]],G));

  // Major impassable boulder/deadfall clusters only.
  out.push(...polyWalls([[120,300],[430,250],[650,400],[760,650]],G));
  out.push(...polyWalls([[500,900],[720,1050],[810,1280],[680,1480]],G));
  out.push(...polyWalls([[1020,1850],[1210,1750],[1430,1850],[1510,2090],[1370,2250]],G));
  out.push(...polyWalls([[2700,250],[3020,170],[3290,340],[3370,640]],G));
  out.push(...polyWalls([[3090,820],[3330,720],[3550,830],[3630,1070]],G));
  out.push(...polyWalls([[3180,1700],[3440,1600],[3690,1710],[3770,1970]],G));
  return out;
}

function caveMoveWall(x1,y1,x2,y2,geometry="v0.7.8-cave") {
  return {
    c:[x1,y1,x2,y2],
    move:20,
    sight:0,
    light:0,
    sound:0,
    door:0,
    ds:0,
    flags:{[MODULE_ID]:{[FLAG]:true,geometry}}
  };
}

function caveMovePoly(points, geometry="v0.7.8-cave") {
  const out=[];
  for(let i=0;i<points.length-1;i++) out.push(caveMoveWall(...points[i],...points[i+1],geometry));
  return out;
}

function caveWalls() {
  const out=[];
  const G="v0.7.8-cave";

  // Central chasm / blue-water drop: primary hard movement boundary.
  out.push(...caveMovePoly([
    [1740,1010],[1880,920],[2020,980],[2110,1130],[2100,1320],
    [2020,1500],[2020,1710],[2100,1920],[2160,2130],[2160,2360],
    [2070,2570],[1910,2720]
  ],G));

  out.push(...caveMovePoly([
    [2240,900],[2390,950],[2500,1110],[2520,1320],[2460,1510],
    [2390,1710],[2440,1910],[2540,2100],[2610,2310],[2580,2490]
  ],G));

  // Lower-left exterior cliff. Keeps tokens from stepping into the large black void
  // without fencing off the Cave Entrance label/room.
  out.push(...caveMovePoly([
    [470,1700],[300,1950],[180,2250],[160,2520],[260,2780],[500,2940],[820,3000]
  ],G));

  // Inner lower-left rock edge.
  out.push(...caveMovePoly([
    [1230,1740],[1140,1990],[1180,2250],[1390,2470],[1650,2620]
  ],G));

  // Central-bottom rock island.
  out.push(...caveMovePoly([
    [1450,2140],[1630,2060],[1810,2110],[1910,2260],[1900,2430],
    [1800,2580],[1620,2670],[1450,2610]
  ],G));

  // Eastern Old Tunnels exterior edge. Intentionally leaves the label and room floor open.
  out.push(...caveMovePoly([
    [3590,1080],[3520,1300],[3570,1500],[3710,1660]
  ],G));

  // Shrine/spider nest outer rock boundary.
  out.push(...caveMovePoly([
    [2770,1940],[2700,2160],[2630,2410],[2660,2690],[2790,3000]
  ],G));
  out.push(...caveMovePoly([
    [3820,1840],[3760,2050],[3790,2220],[3900,2370],[3980,2570]
  ],G));

  // Grikka's Lair outer ceiling/right cliff only; no walls through the label or bridge.
  out.push(...caveMovePoly([
    [2870,300],[3160,170],[3500,130],[3850,190],[4000,270]
  ],G));
  out.push(...caveMovePoly([
    [3720,720],[3900,760],[4000,820]
  ],G));

  // Entrance-area rock margins, with a very large clear corridor around "Cave Entrance".
  out.push(...caveMovePoly([
    [0,520],[360,450],[690,360],[960,390]
  ],G));
  out.push(...caveMovePoly([
    [0,1120],[330,1160],[620,1080],[850,980]
  ],G));

  return out;
}

async function createScene(name,folder,bg,darkness,globalLight,journal,walls=[],lights=[]) {
  let scene=game.scenes.find(s=>s.name===name&&marked(s)); if(scene) return scene;
  scene=await Scene.create({name,folder:folder.id,width:4000,height:3000,padding:0,background:{src:bg,offsetX:0,offsetY:0},grid:{type:1,size:100,distance:5,units:"ft"},tokenVision:true,fog:{mode:2,colors:{explored:null,unexplored:null}},environment:{darknessLevel:darkness,darknessLevelLock:true,cycle:false,globalLight:{enabled:globalLight?1:0,bright:!!globalLight}},journal:journal?.id??null,flags:{[MODULE_ID]:{[FLAG]:true}}});
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
      <p><b>Four-player baseline:</b> Scratch-Scratch 22 HP + 1 rat.</p>
      <p><b>Harder:</b> Scratch-Scratch 30 HP + 1 rat.</p>
      <p><b>Only if the party is cruising:</b> reveal the second rat.</p>
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
  if (m) {
    const changes={};
    if(m.command!==command) changes.command=command;
    if(m.img!==img) changes.img=img;
    if(Object.keys(changes).length) await m.update(changes);
    return m;
  }
  return Macro.create({name,type:"script",command,img,flags:{[MODULE_ID]:{[FLAG]:true}}});
}


async function makeRollTable(name, results, description="") {
  let table=game.tables.find(t=>t.name===name && marked(t));
  const data={
    name,
    description,
    formula:`1d${results.length}`,
    replacement:true,
    displayRoll:true,
    ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},
    flags:{[MODULE_ID]:{[FLAG]:true}}
  };
  if(!table) table=await RollTable.create(data);
  else await table.update(data);

  if(table.results?.size){
    await table.deleteEmbeddedDocuments("TableResult",table.results.map(r=>r.id));
  }
  await table.createEmbeddedDocuments("TableResult",results.map((text,i)=>({
    type:CONST.TABLE_RESULT_TYPES.TEXT,
    text,
    range:[i+1,i+1],
    weight:1,
    drawn:false,
    flags:{[MODULE_ID]:{[FLAG]:true}}
  })));
  return table;
}

async function makeRollTables() {
  const chatter=[
    `<b>“Scratch-Scratch hears everything. Everything.”</b> The goblin glances nervously toward the deeper cave.`,
    `<b>“Grikka says Bell is ours until spider goes away.”</b>`,
    `<b>“Humans put onions in stew. Goblins know better.”</b>`,
    `<b>“No touch shiny web. Last goblin touched shiny web.”</b> Nobody explains what happened to the last goblin.`,
    `<b>“Bell goes clang, spider goes skitter-skitter.”</b>`,
    `<b>“One-Ear is called One-Ear because—”</b> Another goblin immediately tells the speaker to shut up.`,
    `<b>“We didn't steal it. We borrowed it forever.”</b>`,
    `<b>“Big rat is named Bitey. Other big rat is also named Bitey.”</b>`,
    `<b>“If you see eight eyes, run before you count the legs.”</b>`,
    `<b>“Grikka tried to negotiate with spider. Spider negotiated with Grikka's helmet.”</b>`,
    `<b>“Village people scream too much. Goblins scream exactly enough.”</b>`,
    `<b>“Second Bell? What second Bell?”</b> The goblin suddenly becomes extremely interested in the floor.`
  ];

  const festival=[
    `A pie contest has stalled because the head judge keeps “checking” the blackberry entry.`,
    `Two children race wooden hoops between the stalls while an exhausted parent apologizes to everyone they nearly hit.`,
    `A fiddler plays a fast harvest tune while three villagers attempt a dance none of them remembers correctly.`,
    `A farmer proudly displays a pumpkin with a suspicious resemblance to Reeve Mara.`,
    `The smell of fresh bread, apples, smoke, and spiced cider drifts across the green.`,
    `A chalkboard announces: <b>Bell Ringing Ceremony — Sunset</b>. Someone has crossed out the time and written <b>IF WE FIND IT</b>.`,
    `A local dog has stolen a string of sausages and is being pursued by a butcher who is losing badly.`,
    `Festival ribbons in gold and green stretch between the buildings and snap in the breeze.`,
    `Brother Alden's donation basket contains three copper pieces, a button, and a polished acorn.`,
    `A merchant loudly insists that every carved wooden raven is “absolutely traditional,” despite having made them yesterday.`,
    `Villagers have started swapping increasingly ridiculous rumors about the Bell's disappearance.`,
    `A small empty pedestal near the shrine is decorated with flowers where the Bell should have been displayed.`
  ];

  const cave=[
    `A scrap of red festival ribbon is snagged on a sharp rock—evidence the Bell came this way.`,
    `Tiny three-toed footprints overlap larger goblin tracks in the damp grit. The smaller prints belong to rats.`,
    `A strand of unusually thick webbing trembles although there is no breeze.`,
    `Someone has scratched <b>NO SPIDER</b> into the wall in crude Goblin.`,
    `A dented cooking pot contains cold mushroom stew and one spoon far too large for a goblin.`,
    `A cracked stone carving shows Saint Arlen holding a small bell toward a crouching beast.`,
    `A bundle of discarded cloth contains a bent silver holy symbol worth little but recognizable to Brother Alden.`,
    `A faint metallic chime echoes from deeper inside, followed by abrupt silence.`,
    `A dead cave beetle the size of a fist has been wrapped neatly in silk and suspended from the ceiling.`,
    `A narrow side crevice contains three smooth stones arranged like chairs around a fourth stone used as a table.`,
    `A charcoal sketch on the wall depicts a huge spider with exaggerated fangs and several terrified stick-goblins.`,
    `Behind loose rubble is the corner of an older worked-stone passage, hinting that the cave existed long before the goblins arrived.`
  ];

  await makeRollTable("BG - Goblin Chatter",chatter,
    "Quick goblin dialogue, clues, and comic relief for Crooked Fang Cave.");
  await makeRollTable("BG - Briar Glen Festival Details",festival,
    "Small sensory details and incidents to make the Harvest Festival feel alive.");
  await makeRollTable("BG - Cave Discoveries",cave,
    "Optional discoveries, clues, and atmospheric details while exploring Crooked Fang Cave.");

  await makeMacro("BG - Roll Goblin Chatter",
    `const t=game.tables.getName("BG - Goblin Chatter"); if(!t)return ui.notifications.warn("BG - Goblin Chatter table not found."); await t.draw({displayChat:true});`,
    "icons/svg/d20-black.svg");
  await makeMacro("BG - Roll Festival Detail",
    `const t=game.tables.getName("BG - Briar Glen Festival Details"); if(!t)return ui.notifications.warn("BG - Briar Glen Festival Details table not found."); await t.draw({displayChat:true});`,
    "icons/svg/d20-black.svg");
  await makeMacro("BG - Roll Cave Discovery",
    `const t=game.tables.getName("BG - Cave Discoveries"); if(!t)return ui.notifications.warn("BG - Cave Discoveries table not found."); await t.draw({displayChat:true});`,
    "icons/svg/d20-black.svg");
}

async function makeGMTools() {
  await makeMacro("BG - Reveal Selected Tokens",
    `const toks=canvas.tokens.controlled; if(!toks.length)return ui.notifications.warn("Select token(s) first."); await canvas.scene.updateEmbeddedDocuments("Token",toks.map(t=>({_id:t.id,hidden:false})));`);
  await makeMacro("BG - Hide Selected Tokens",
    `const toks=canvas.tokens.controlled; if(!toks.length)return ui.notifications.warn("Select token(s) first."); await canvas.scene.updateEmbeddedDocuments("Token",toks.map(t=>({_id:t.id,hidden:true})));`);
  await makeMacro("BG - Ring the Bell",
    `const target=[...game.user.targets][0]; if(!target)return ui.notifications.warn("Target Scratch-Scratch first."); ChatMessage.create({content:"<h2>🔔 The Bell of Saint Arlen Rings!</h2><p>Scratch-Scratch must make a <b>DC 12 Wisdom saving throw</b>. On a failure it is <b>Frightened of the bell-ringer until the end of its next turn</b>. After its first successful Bell save, it has advantage on later Bell saves.</p>"});`,
    "icons/sundries/misc/bell.webp");
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
  if (!p) {
    p=await Playlist.create({name,mode:0,flags:{[MODULE_ID]:{[FLAG]:true}}});
  }
  const path=`modules/${MODULE_ID}/assets/audio/${filename}`;
  try {
    const sounds=Array.from(p.sounds ?? []);
    if (!sounds.length) {
      await p.createEmbeddedDocuments("PlaylistSound",[{name,path,repeat:true,volume}]);
    } else {
      await p.updateEmbeddedDocuments("PlaylistSound",
        sounds.map((s,i)=>({_id:s.id,name:i===0?name:s.name,path:i===0?path:s.path,repeat:i===0?true:s.repeat,volume:i===0?volume:s.volume}))
      );
    }
  } catch(err){console.warn(`${MODULE_ID} | Could not create/repair sound ${name}`,err);}
  return p;
}

async function makeAudioSuite() {
  return {
    village:await makePlaylist("BG - Village & Festival","village-ambience.mp3",0.22),
    forest:await makePlaylist("BG - Forest","forest-ambience.mp3",0.20),
    cave:await makePlaylist("BG - Cave","cave-ambience.mp3",0.20),
    boss:await makePlaylist("BG - Scratch-Scratch","boss-tension.mp3",0.24),
    victory:await makePlaylist("BG - Victory","victory-ambience.mp3",0.22)
  };
}

async function makeSceneChatMacro(name, sceneName, tacticalSceneName, html, cue) {
  const command=`const totm=game.scenes.getName(${JSON.stringify(sceneName)});
const tactical=game.scenes.getName(${JSON.stringify(tacticalSceneName)});
if(!totm)return ui.notifications.warn("TOTM scene not found: ${sceneName}");
await totm.activate();
await ChatMessage.create({content:${JSON.stringify(html)}});
if(!tactical)return ui.notifications.warn("Tactical scene not found: ${tacticalSceneName}");
new foundry.applications.api.DialogV2({
  window:{title:"Briar Glen — Ready for Tactical Map?"},
  content:${JSON.stringify(`<p><b>GM cue:</b> ${cue}</p><p>Keep the party on the theater-of-the-mind scene while you narrate. When you are ready to place tokens and continue play, switch everyone to <b>${tacticalSceneName}</b>.</p>`)},
  buttons:[
    {
      action:"switch",
      label:"Open Tactical Map",
      icon:"<i class='fa-solid fa-map'></i>",
      default:true,
      callback:async()=>{await tactical.activate(); return "switch";}
    },
    {
      action:"stay",
      label:"Stay on TOTM",
      icon:"<i class='fa-solid fa-book-open'></i>",
      callback:()=> "stay"
    }
  ]
}).render({force:true});`;
  return makeMacro(name,command,"icons/svg/book.svg");
}

async function makeTransitionMacros() {
  await makeSceneChatMacro("BG - Opening","TOTM 01 - Briar Glen Arrival","01 - Briar Glen",
    `<h2>The Stolen Bell of Briar Glen</h2><p>Morning sunlight spills across the thatched roofs of Briar Glen. Festival ribbons flutter over the square. Then the iron alarm bell begins to ring...</p>`,
    "Finish the opening narration and let the players take in Briar Glen before beginning investigation and token movement.");

  await makeSceneChatMacro("BG - Journey to Crow's Tooth","TOTM 02 - Crow's Tooth Hill","02 - Forest Trail",
    `<h2>Toward Crow's Tooth Hill</h2><p>The village road narrows into a woodland trail. Ahead, the jagged silhouette of Crow's Tooth rises above the trees.</p>`,
    "Finish the travel narration. Switch when the party reaches the ambush area and tactical positioning matters.");

  await makeSceneChatMacro("BG - Enter the Cave","TOTM 03 - Cave Interior","03 - Crooked Fang Cave",
    `<h2>Crooked Fang Cave</h2><p>Cool air breathes from the black opening. Somewhere inside, water drips with slow, patient regularity.</p>`,
    "Let the cave atmosphere land, then switch when the characters cross the entrance and exploration begins.");

  await makeSceneChatMacro("BG - Grikka Parley","TOTM 04 - Grikka's Parley","03 - Crooked Fang Cave",
    `<h2>Grikka One-Ear</h2><p>The goblin in the cooking-pot helmet raises both hands. “Wait! Wait! You want Bell? We talk first.”</p>`,
    "Run Grikka's opening line here. Switch back to the cave map when players begin moving, negotiating around the room, or combat starts.");

  await makeSceneChatMacro("BG - Shrine Reveal","TOTM 05 - The Old Shrine","03 - Crooked Fang Cave",
    `<h2>The Old Shrine</h2><p>Worked stone emerges from the natural cave. Candles gutter around a cracked altar, and thick webs vanish into the darkness overhead.</p>`,
    "Describe the shrine and Bell before returning to tactical exploration.");

  await makeSceneChatMacro("BG - Scratch-Scratch Reveal","TOTM 06 - Scratch-Scratch Revealed","03 - Crooked Fang Cave",
    `<h2>Scratch-Scratch</h2><p>A shape unfolds above you. Too many legs. Too many eyes. The web trembles—and something enormous drops toward the shrine floor.</p>`,
    "Use the reveal for the dramatic beat, then switch to the cave map and begin the boss encounter.");

  await makeSceneChatMacro("BG - Finale","TOTM 07 - Triumph in Briar Glen","01 - Briar Glen",
    `<h2>The Bell Returns</h2><p>The silver Bell rings over Briar Glen once more. Cheers roll across the village green as festival ribbons lift in the evening breeze.</p>`,
    "Keep the finale on TOTM for the celebration. Open Briar Glen only if players want to continue roleplaying in the village.");
}

async function makeAudioMacros() {
  const names=["BG - Village & Festival","BG - Forest","BG - Cave","BG - Scratch-Scratch","BG - Victory"];
  for(const n of names){
    await makeMacro(`Play ${n}`,
      `const p=game.playlists.getName(${JSON.stringify(n)}); if(!p)return ui.notifications.warn("Playlist not found: ${n}"); if(!p.sounds.size)return ui.notifications.warn("Playlist has no sounds: ${n}"); await p.playAll(); ui.notifications.info("Playing ${n}");`,
      "icons/svg/sound.svg");
  }
  await makeMacro("BG - Stop All Audio",
    `const playing=game.playlists.filter(p=>p.playing); for(const p of playing) await p.stopAll(); ui.notifications.info("Stopped Briar Glen audio.");`,
    "icons/svg/mute.svg");
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
    `ChatMessage.create({content:"<h2>The Goblin Drops Its Weapon</h2><p>“No more! No more! Grikka take shiny Bell! Bell scares Scratch-Scratch!”</p>"});`,
    "icons/svg/peace.svg");
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


async function repairTacticalBackgrounds() {
  const defs = [
    ["01 - Briar Glen", "briar-glen.png"],
    ["02 - Forest Trail", "forest-trail.png"],
    ["03 - Crooked Fang Cave", "crooked-fang-cave.png"]
  ];
  for (const [name,file] of defs) {
    const s = game.scenes.getName(name);
    if (!s) continue;
    const expected = `modules/${MODULE_ID}/assets/maps/${file}`;
    const current = s.background?.src ?? s.img ?? "";
    if (current !== expected) {
      await s.update({"background.src": expected});
    }
  }
}


async function repairTacticalGeometryV074() {
  const defs = [
    ["01 - Briar Glen","briar-glen.png"],
    ["02 - Forest Trail","forest-trail.png"],
    ["03 - Crooked Fang Cave","crooked-fang-cave.png"]
  ];

  for (const [name,file] of defs) {
    const s=game.scenes.getName(name);
    if(!s) continue;
    await s.update({
      width:4000,height:3000,padding:0,
      "background.src":`modules/${MODULE_ID}/assets/maps/${file}`,
      "background.offsetX":0,"background.offsetY":0,
      "grid.type":1,"grid.size":100,"grid.distance":5,"grid.units":"ft"
    });
  }

  const forest=game.scenes.getName("02 - Forest Trail");
  if(forest){
    const goblins=forest.tokens.filter(t=>game.actors.get(t.actorId)?.name==="Beginner Goblin");
    const pos=[[3000,600],[3375,775],[2825,950]];
    const updates=goblins.slice(0,3).map((t,i)=>({_id:t.id,x:pos[i][0],y:pos[i][1]}));
    if(updates.length) await forest.updateEmbeddedDocuments("Token",updates);
  }

  const village=game.scenes.getName("01 - Briar Glen");
  if(village){
    const shrine=village.lights.find(l=>l.name==="Shrine daylight");
    if(shrine) await village.updateEmbeddedDocuments("AmbientLight",[{_id:shrine.id,x:3000,y:2050}]);
  }

  const cave=game.scenes.getName("03 - Crooked Fang Cave");
  if(cave){
    // Rebuild module cave walls against the final artwork.
    if(cave.walls.size) await cave.deleteEmbeddedDocuments("Wall",cave.walls.map(w=>w.id));
    await cave.createEmbeddedDocuments("Wall",caveWalls());

    // Re-anchor lights to visible landmarks on the final battlemap.
    const lightPos={
      "Common-room fire":[1550,600],
      "Grikka lantern":[3275,430],
      "Entrance daylight spill":[700,1025]
    };
    const lightUpdates=cave.lights.filter(l=>lightPos[l.name]).map(l=>({_id:l.id,x:lightPos[l.name][0],y:lightPos[l.name][1]}));
    if(lightUpdates.length) await cave.updateEmbeddedDocuments("AmbientLight",lightUpdates);

    // Re-anchor encounter tokens to the illustrated rooms.
    const goblins=cave.tokens.filter(t=>game.actors.get(t.actorId)?.name==="Beginner Goblin");
    const goblinPos=[[650,1050],[950,1125],[1350,525],[1650,650],[1450,825],[3050,500]];
    let tokenUpdates=goblins.slice(0,6).map((t,i)=>({_id:t.id,x:goblinPos[i][0],y:goblinPos[i][1]}));
    const grikka=cave.tokens.find(t=>game.actors.get(t.actorId)?.name==="Grikka One-Ear");
    const spider=cave.tokens.find(t=>game.actors.get(t.actorId)?.name==="Scratch-Scratch");
    const rats=cave.tokens.filter(t=>game.actors.get(t.actorId)?.name==="Giant Rat - Briar Glen");
    if(grikka) tokenUpdates.push({_id:grikka.id,x:3250,y:425});
    if(spider) tokenUpdates.push({_id:spider.id,x:3150,y:2625});
    if(rats[0]) tokenUpdates.push({_id:rats[0].id,x:2800,y:2325});
    if(rats[1]) tokenUpdates.push({_id:rats[1].id,x:3475,y:2300});
    if(tokenUpdates.length) await cave.updateEmbeddedDocuments("Token",tokenUpdates);

    // Move existing map notes onto the same artwork coordinate system.
    const notePos={
      "1 - Entrance":[700,1000],"2 - Alarm Trap":[1225,900],"3 - Common Room":[1550,575],
      "4 - Old Tunnel":[3250,1350],"5 - Grikka's Den":[3250,425],"6 - Old Shrine":[3000,2150],
      "ROOM 1 - Cave Entrance":[700,1000],"ROOM 2 - Alarm Trap":[1225,900],"ROOM 3 - Goblin Common Room":[1550,575],
      "ROOM 4 - Old Tunnel":[3250,1350],"ROOM 5 - Grikka's Den":[3250,425],"ROOM 6 - Old Shrine":[3000,2150],
      "⚠ Alarm Tripwire — Perception 11 / Sleight of Hand 10":[1225,900],
      "🔑 Webbed pouch — brass key":[3100,1450],
      "💰 Old Shrine Chest — 35 gp + 2 healing potions + silvered dagger + map":[3000,2200]
    };
    const noteUpdates=cave.notes.filter(n=>notePos[n.text]).map(n=>({_id:n.id,x:notePos[n.text][0],y:notePos[n.text][1]}));
    if(noteUpdates.length) await cave.updateEmbeddedDocuments("Note",noteUpdates);
  }
  ui.notifications.info("Briar Glen v0.7.4: tactical geometry aligned to the 4000×3000 maps.");
}


async function ensureNamedToken(scene, actor, x, y, hidden=true) {
  if(!scene || !actor) return null;
  let tok=scene.tokens.find(t=>t.actorId===actor.id || t.name===actor.name);
  if(tok) {
    const update={_id:tok.id,x,y,hidden};
    if(tok.name!==actor.name) update.name=actor.name;
    await scene.updateEmbeddedDocuments("Token",[update]);
    return scene.tokens.get(tok.id);
  }
  try {
    const td=await actor.getTokenDocument({x,y,hidden});
    const data=td.toObject();
    delete data._id;
    data.name=actor.name;
    data.actorId=actor.id;
    const [created]=await scene.createEmbeddedDocuments("Token",[data]);
    return created;
  } catch(err) {
    console.error(`${MODULE_ID} | Failed to ensure token for ${actor.name}`,err);
    return null;
  }
}

async function repairNamedBossActorsAndTokens(actorFolder, cave) {
  let grikka=game.actors.getName("Grikka One-Ear");
  if(!grikka) grikka=await cloneNPC("Goblin","Grikka One-Ear",16,actorFolder,
    "Goblin leader. Prefers negotiation. Surrenders at 5 HP or fewer unless Scratch-Scratch is present.");

  let scratch=game.actors.getName("Scratch-Scratch");
  if(!scratch) scratch=await cloneNPC("Giant Spider","Scratch-Scratch",30,actorFolder,
    "Bell weakness: DC 12 Wisdom save or Frightened of bell-ringer until end of next turn. After first successful save, advantage on later Bell saves.");

  if(grikka) {
    await applyActorArt(grikka,"grikka-one-ear");
    await ensureNamedToken(cave,grikka,3250,425,true);
  }
  if(scratch) {
    await applyActorArt(scratch,"scratch-scratch");
    await ensureNamedToken(cave,scratch,3150,2525,true);
  }

  return {grikka,scratch};
}


async function replaceModuleWalls(scene, walls) {
  if(!scene) return;
  const old=scene.walls.filter(w=>w.flags?.[MODULE_ID]?.[FLAG]).map(w=>w.id);
  if(old.length) await scene.deleteEmbeddedDocuments("Wall",old);
  if(walls.length) await scene.createEmbeddedDocuments("Wall",walls);
}

async function repairSceneAuthoringV076(actorFolder, journalFolder, village, forest, cave) {
  await makePlayerHandouts(journalFolder);

  const mara=await makeCivilianNPC("Reeve Mara Thistlebrook","mara-thistlebrook",actorFolder,
    "<p>Practical, direct reeve of Briar Glen. Offers the party 100 gp total to recover the Bell of Saint Arlen.</p>");
  const alden=await makeCivilianNPC("Brother Alden","brother-alden",actorFolder,
    "<p>Keeper of the Shrine of Saint Arlen. Deeply worried about the missing Bell and what its theft means to the village.</p>");
  const tobbin=await makeCivilianNPC("Tobbin Reed","tobbin-reed",actorFolder,
    "<p>Young eyewitness who saw goblins fleeing toward Crow's Tooth Hill and heard the name “Grikka.”</p>");

  await ensureNamedToken(village,mara,1050,1120,false);
  await ensureNamedToken(village,alden,3050,2025,false);
  await ensureNamedToken(village,tobbin,2050,1350,false);

  await replaceModuleWalls(village,villageWalls());
  await replaceModuleWalls(forest,forestWalls());
  await replaceModuleWalls(cave,caveWalls());

  ui.notifications.info("Briar Glen v0.7.8: label-adjacent barriers removed and cave walls changed to movement-only.");
}


async function findDnd5eItem(name, allowedTypes=[]) {
  const wanted=String(name).trim().toLowerCase();
  for(const pack of game.packs.filter(p=>p.documentName==="Item" && p.metadata?.packageName==="dnd5e")){
    try{
      const idx=await pack.getIndex({fields:["name","type"]});
      const hit=idx.find(e=>String(e.name).trim().toLowerCase()===wanted && (!allowedTypes.length || allowedTypes.includes(e.type)));
      if(hit){
        const doc=await pack.getDocument(hit._id);
        if(doc) return doc.toObject();
      }
    }catch(err){ console.warn(`${MODULE_ID} | Could not search ${pack.collection} for ${name}`,err); }
  }
  return null;
}

async function addPCItem(actor, name, allowedTypes=[], quantity=null, fallbackType="equipment", fallbackDescription="") {
  if(actor.items.some(i=>i.name===name)) return actor.items.find(i=>i.name===name);
  let data=await findDnd5eItem(name,allowedTypes);
  if(data){
    delete data._id;
    data.flags={...(data.flags??{}),[MODULE_ID]:{[FLAG]:true,pcItem:true}};
    if(quantity!==null && data.system && "quantity" in data.system) data.system.quantity=quantity;
  }else{
    data={
      name,
      type:fallbackType,
      img:"icons/svg/item-bag.svg",
      system:{description:{value:fallbackDescription||`<p>Imported from the player's supplied D&D Beyond character sheet.</p>`}},
      flags:{[MODULE_ID]:{[FLAG]:true,pcItem:true}}
    };
  }
  const [created]=await actor.createEmbeddedDocuments("Item",[data]);
  return created;
}

function pcOwnership(playerName) {
  const ownership={default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE};
  const wanted=String(playerName??"").trim().toLowerCase();
  const user=game.users.find(u=>{
    const n=String(u.name??"").trim().toLowerCase();
    return n===wanted || n.includes(wanted) || wanted.includes(n);
  });
  if(user) ownership[user.id]=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
  return {ownership,user};
}

async function makePCCharacter(spec, folder) {
  let actor=game.actors.find(a=>a.name===spec.name && marked(a));
  const {ownership,user}=pcOwnership(spec.player);
  const abilities={};
  for(const [key,value] of Object.entries(spec.abilities)){
    abilities[key]={value,proficient:spec.saveProficiencies.includes(key)?1:0};
  }
  const skills={};
  for(const [key,value] of Object.entries(spec.skills??{})) skills[key]={value};

  const system={
    abilities,
    skills,
    attributes:{
      hp:{value:spec.hp,max:spec.hp,temp:0},
      ac:{calc:"flat",flat:spec.ac},
      movement:{walk:30,units:"ft"},
      senses:{darkvision:spec.darkvision??0,units:"ft"},
      spellcasting:spec.spellcasting??""
    },
    details:{
      alignment:spec.alignment??"",
      biography:{value:spec.biography??""}
    }
  };
  if(spec.spellSlots){
    system.spells={spell1:{value:spec.spellSlots,max:spec.spellSlots}};
  }

  const actorData={
    name:spec.name,
    type:"character",
    folder:folder.id,
    img:`modules/${MODULE_ID}/assets/characters/portraits/${spec.slug}.jpg`,
    ownership,
    system,
    prototypeToken:{
      name:spec.name,
      actorLink:true,
      disposition:CONST.TOKEN_DISPOSITIONS.FRIENDLY,
      displayName:CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
      displayBars:CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
      bar1:{attribute:"attributes.hp"},
      texture:{src:`modules/${MODULE_ID}/assets/characters/tokens/${spec.slug}.png`,scaleX:1,scaleY:1},
      sight:{
        enabled:true,
        range:spec.darkvision?60:0,
        visionMode:spec.darkvision?"darkvision":"basic"
      }
    },
    flags:{[MODULE_ID]:{[FLAG]:true,playerCharacter:true,sourcePlayer:spec.player}}
  };

  if(!actor) actor=await Actor.create(actorData);
  else await actor.update(actorData);

  // Add class first so the dnd5e sheet reports the correct level where possible.
  const classData=await findDnd5eItem(spec.className,["class"]);
  if(!actor.items.some(i=>i.type==="class" && i.name===spec.className)){
    if(classData){
      delete classData._id;
      classData.system={...(classData.system??{}),levels:1};
      classData.flags={...(classData.flags??{}),[MODULE_ID]:{[FLAG]:true,pcItem:true}};
      await actor.createEmbeddedDocuments("Item",[classData]);
    }else{
      await addPCItem(actor,spec.className,[],null,"class",`<p>${spec.className} 1, imported from the supplied character sheet.</p>`);
    }
  }

  // Preserve the supplied sheet's species/background as sheet-visible features.
  await addPCItem(actor,`${spec.species} — Species`,[],null,"feat",`<p><b>Species:</b> ${spec.species}. Imported from the supplied D&D Beyond sheet.</p>`);
  await addPCItem(actor,`${spec.background} — Background`,[],null,"feat",`<p><b>Background:</b> ${spec.background}. Imported from the supplied D&D Beyond sheet.</p>`);

  for(const item of spec.items??[]){
    await addPCItem(actor,item.name,item.types??[],item.quantity??null,item.fallbackType??"equipment",item.description??"");
  }
  for(const feat of spec.features??[]){
    await addPCItem(actor,feat.name,["feat"],null,"feat",feat.description??"");
  }
  for(const spell of spec.spells??[]){
    const created=await addPCItem(actor,spell.name,["spell"],null,"spell",spell.description??"");
    if(created && spell.prepared!==undefined){
      try{ await created.update({"system.preparation.mode":"prepared","system.preparation.prepared":spell.prepared}); }catch(err){}
    }
  }

  if(!user) console.warn(`${MODULE_ID} | No Foundry user matched D&D Beyond player '${spec.player}'. Assign Owner permission to ${spec.name} manually.`);
  return actor;
}

async function makePCSourceJournal(spec, folder) {
  const name=`SOURCE SHEET - ${spec.name}`;
  const href=`modules/${MODULE_ID}/assets/characters/${spec.pdf}`;
  const content=`<h1>${spec.name}</h1>
    <p><b>Player:</b> ${spec.player}<br><b>Character:</b> ${spec.species} ${spec.className} 1<br><b>Background:</b> ${spec.background}</p>
    <p><a href="${href}" target="_blank">Open supplied D&amp;D Beyond PDF</a></p>
    <p>This journal is a GM reference copy of the exact PDF supplied for the session. The playable Foundry Actor is created separately by the installer.</p>`;
  let j=game.journal.find(x=>x.name===name && marked(x));
  if(!j){
    j=await JournalEntry.create({name,folder:folder.id,ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},flags:{[MODULE_ID]:{[FLAG]:true}}});
    await j.createEmbeddedDocuments("JournalEntryPage",[{name:"Source Character Sheet",type:"text",text:{content,format:1}}]);
  }else{
    const page=j.pages?.contents?.[0];
    if(page) await page.update({"text.content":content});
  }
  return j;
}

async function ensurePCToken(scene,actor,x,y) {
  if(!scene || !actor) return;
  const existing=scene.tokens.find(t=>t.actorId===actor.id || t.name===actor.name);
  const data={
    name:actor.name,
    actorId:actor.id,
    actorLink:true,
    x,y,
    hidden:false,
    disposition:CONST.TOKEN_DISPOSITIONS.FRIENDLY,
    texture:{src:actor.prototypeToken.texture.src},
    sight:foundry.utils.deepClone(actor.prototypeToken.sight),
    bar1:{attribute:"attributes.hp"},
    flags:{[MODULE_ID]:{[FLAG]:true,playerCharacter:true}}
  };
  if(existing) await existing.update(data);
  else await scene.createEmbeddedDocuments("Token",[data]);
}

async function makeSessionPCs(actorFolder,journalFolder,village,forest,cave) {
  const pcFolder=await makeFolder("Briar Glen - Player Characters","Actor");

  const specs=[
    {
      name:"Lady Sunferia",slug:"lady-sunferia",player:"zannapie",className:"Wizard",species:"High Elf",background:"Sage",pdf:"lady-sunferia-sheet.pdf",
      abilities:{str:8,dex:12,con:13,int:17,wis:15,cha:10},
      saveProficiencies:["int","wis"],skills:{arc:1,his:1,ins:1,inv:1,prc:1},hp:7,ac:11,darkvision:60,spellcasting:"int",spellSlots:2,
      alignment:"Lawful Good",
      biography:`<p><b>Age:</b> 13; <b>Height:</b> 5'6"; <b>Skin:</b> tan; <b>Eyes:</b> blue; <b>Hair:</b> blond French braids.</p>
      <p>Sunferia grew up in a peaceful village along a sunflower-lined river until the river turned green and the fields began to wither. She secretly studied magic under Sky, a warm, grandparent-like wizard in the village library. She left to seek the knowledge needed to save her people and knows little of her family history beyond a grandfather who vanished before she was born.</p>`,
      items:[
        {name:"Dagger",types:["weapon"],quantity:2},
        {name:"Quarterstaff",types:["weapon"],quantity:2},
        {name:"Spellbook",types:["equipment","loot"],quantity:1},
        {name:"Backpack",types:["container","equipment"],quantity:1},
        {name:"Calligrapher's Supplies",types:["tool"],quantity:1},
        {name:"Robe",types:["equipment"],quantity:2},
        {name:"Oil",types:["consumable","loot"],quantity:10},
        {name:"Tinderbox",types:["equipment","loot"],quantity:1},
        {name:"Lamp",types:["equipment"],quantity:1}
      ],
      features:[
        {name:"Arcane Recovery",description:"<p>Once per Long Rest after a Short Rest, recover expended spell slots with a combined level of 1.</p>"},
        {name:"Fey Ancestry",description:"<p>Advantage on saving throws to avoid or end the Charmed condition.</p>"},
        {name:"Trance",description:"<p>Magic cannot put you to sleep; complete a Long Rest in 4 hours of trancelike meditation.</p>"},
        {name:"Magic Initiate (Wizard)",description:"<p>Origin feat from the supplied character sheet.</p>"}
      ],
      spells:[
        {name:"Light",prepared:true},{name:"Mage Hand",prepared:true},{name:"Ray of Frost",prepared:true},
        {name:"Fire Bolt",prepared:true},{name:"Minor Illusion",prepared:true},{name:"Elementalism",prepared:true},
        {name:"Mage Armor",prepared:true},{name:"Magic Missile",prepared:true},{name:"Feather Fall",prepared:true},
        {name:"Sleep",prepared:true},{name:"Thunderwave",prepared:true},{name:"Detect Magic",prepared:true},{name:"Shield",prepared:true}
      ]
    },
    {
      name:"Gorbech",slug:"gorbech",player:"gavineklund",className:"Barbarian",species:"Human",background:"Soldier",pdf:"gorbech-sheet.pdf",
      abilities:{str:16,dex:12,con:10,int:8,wis:15,cha:14},
      saveProficiencies:["str","con"],skills:{ath:1,itm:1,sur:1},hp:12,ac:11,darkvision:0,spellcasting:"",
      biography:`<p>The supplied sheet identifies Gorbech as a Human Barbarian 1 with the Soldier background. No appearance, backstory, or equipment inventory was entered on the PDF.</p>`,
      items:[],
      features:[
        {name:"Rage",description:"<p><b>2 / Long Rest.</b> Enter Rage as a Bonus Action while not wearing Heavy Armor.</p>"},
        {name:"Unarmored Defense",description:"<p>The supplied sheet reports AC 11 while unarmored.</p>"},
        {name:"Savage Attacker",description:"<p>Once per turn when you hit with a weapon, roll the weapon's damage dice twice and use either roll.</p>"},
        {name:"Weapon Mastery",description:"<p>Chosen masteries on the supplied sheet: Greataxe (Cleave) and Warhammer (Push). The PDF's equipment inventory is empty, so those weapons are not added to inventory automatically.</p>"}
      ]
    },
    {
      name:"Brash",slug:"brash",player:"techiki",className:"Rogue",species:"Black Dragonborn",background:"Criminal / Spy",pdf:"brash-sheet.pdf",
      abilities:{str:14,dex:15,con:13,int:13,wis:11,cha:9},
      saveProficiencies:["dex","int"],skills:{acr:1,ath:1,dec:2,itm:1,per:1,ste:2},hp:9,ac:12,darkvision:60,spellcasting:"",
      alignment:"Chaotic Good",
      biography:`<p><b>Age:</b> 20; <b>Height:</b> 6'0"; <b>Skin:</b> tan; <b>Eyes:</b> blue; <b>Hair:</b> short dark hair.</p>
      <p>Brash's parents died to a dragon when he was three. He entered a life of crime, made a serious mistake, and is trying to redeem himself. He belongs to the thieves' guild and prefers making a new friend to making a new enemy.</p>`,
      items:[
        {name:"Leather Armor",types:["equipment"],quantity:1},
        {name:"Dagger",types:["weapon"],quantity:2},
        {name:"Shortbow",types:["weapon"],quantity:1},
        {name:"Shortsword",types:["weapon"],quantity:1},
        {name:"Thieves' Tools",types:["tool"],quantity:1},
        {name:"Arrows",types:["consumable"],quantity:20},
        {name:"Crowbar",types:["equipment","loot"],quantity:3},
        {name:"Backpack",types:["container","equipment"],quantity:1},
        {name:"Rope, Hempen (50 feet)",types:["equipment","loot"],quantity:1},
        {name:"Torch",types:["consumable","equipment"],quantity:10},
        {name:"Ball Bearings",types:["consumable","equipment"],quantity:1000},
        {name:"Hooded Lantern",types:["equipment"],quantity:1}
      ],
      features:[
        {name:"Sneak Attack",description:"<p>Once per turn, deal an extra 1d6 damage with a Finesse or Ranged weapon when the supplied Sneak Attack conditions are met.</p>"},
        {name:"Expertise",description:"<p>Expertise: Deception and Stealth.</p>"},
        {name:"Thieves' Cant",description:"<p>You know Thieves' Cant.</p>"},
        {name:"Breath Weapon (Acid)",description:"<p><b>2 / Long Rest.</b> Replace one attack with a 15-ft. cone or 30-ft. line; DC 11 Dexterity save, 1d10 acid damage, half on success.</p>"},
        {name:"Draconic Resistance (Acid)",description:"<p>Resistance to acid damage.</p>"},
        {name:"Weapon Mastery",description:"<p>Dagger (Nick) and Hand Crossbow (Vex) are the selected masteries on the supplied sheet.</p>"}
      ]
    }
  ];

  const actors=[];
  for(const spec of specs){
    const a=await makePCCharacter(spec,pcFolder);
    await makePCSourceJournal(spec,journalFolder);
    actors.push(a);
  }

  // Put the three known PCs at sensible entry positions on every tactical scene.
  const sceneStarts=[
    [village,[[1600,2500],[1750,2500],[1900,2500]]],
    [forest, [[1150,2450],[1300,2450],[1450,2450]]],
    [cave,   [[250,700],[400,700],[550,700]]]
  ];
  for(const [scene,coords] of sceneStarts){
    for(let i=0;i<actors.length;i++) await ensurePCToken(scene,actors[i],coords[i][0],coords[i][1]);
  }

  return actors;
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
  await makeGMQuickStart(journalFolder);
  await makeGMDashboard(journalFolder);
  const roomJournals=await makeRoomJournals(journalFolder);

  // v0.7.9: Earlier builds defined these macro suites but never called them.
  // Create/repair them every time the installer runs. makeMacro() is idempotent.
  await makeRollTables();
  await makeGMTools();
  await makeExplorationMacros();
  await makeTransitionMacros();
  await makeAudioSuite();
  await makeAudioMacros();
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
  await addRoomPins(cave,roomJournals);
  await addCaveHazards(cave,journal);
  await makeSessionPCs(actorFolder,journalFolder,village,forest,cave);
  await putToken(forest,goblin,2500,1050,true); await putToken(forest,goblin,3050,900,true); await putToken(forest,goblin,2230,1300,true);
  await putToken(cave,goblin,1750,2600,true); await putToken(cave,goblin,2250,2600,true); await putToken(cave,goblin,1550,1550,true); await putToken(cave,goblin,1950,1450,true); await putToken(cave,goblin,2350,1700,true); await putToken(cave,goblin,2450,950,true);
  await putToken(cave,grikka,2000,850,true); await putToken(cave,spider,2000,330,true); await putToken(cave,rat,1600,420,true); await putToken(cave,rat,2450,400,true);
  try {
    const notes=[[2000,2650,"1 - Entrance"],[2000,2150,"2 - Alarm Trap"],[1900,1650,"3 - Common Room"],[3000,1600,"4 - Old Tunnel"],[2000,900,"5 - Grikka's Den"],[2000,320,"6 - Old Shrine"]].map(([x,y,text])=>({x,y,entryId:journal.id,text,icon:"icons/svg/book.svg"}));
    await cave.createEmbeddedDocuments("Note",notes);
  } catch(err){console.warn(`${MODULE_ID} | map note warning`,err);}
  await repairTacticalGeometryV074();
  await repairNamedBossActorsAndTokens(actorFolder, cave);
  await repairSceneAuthoringV076(actorFolder, journalFolder, village, forest, cave);
  ui.notifications.info("Briar Glen v0.9.5 installed/updated: three supplied player characters, tokens, source sheets, four-player guidance, and prior adventure content are ready.");
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
