# The Stolen Bell of Briar Glen — Foundry V14 / D&D5e 6.x

Functional development build for **five player-created Level-1 characters**.

## Included

- Briar Glen village scene
- Forest Trail ambush scene
- Crooked Fang Cave scene
- 100 px / 5 ft grids
- Token vision
- **Shared Fog of War** (`fog.mode = 2`)
- Daylight/global illumination in village and forest
- **Global illumination OFF in the cave**
- Cave darkness locked at 0.88
- Dynamic cave walls and one interactive barricade/door
- Common-room firelight, Grikka lantern light, entrance daylight spill
- Hidden encounter tokens
- GM journal with keyed areas and adventure notes
- Bell of Saint Arlen item
- Crowned Raven Map handout/item
- Empty `Briar Glen Adventuring Party` group Actor
- NPC/monster Actors cloned from the installed D&D5e SRD Goblin, Giant Rat, and Giant Spider when available
- **No player-character Actors**

## Installation

1. Unzip the `stolen-bell-briar-glen` folder into `FoundryVTT/Data/modules/`.
2. Restart Foundry.
3. Open your D&D5e world.
4. Enable **The Stolen Bell of Briar Glen** under Manage Modules.
5. Open the Macro Directory.
6. Run **Briar Glen - Install Adventure** once.

## Add the five PCs later

1. Create/import each PC normally.
2. Give each player OWNER permission to their own Actor.
3. Set each PC's Prototype Token vision from the actual character's 2024 species/features.
4. Optionally add all five to `Briar Glen Adventuring Party`.
5. Drag the five PC tokens onto `01 - Briar Glen`.

The cave assumes nothing about Darkvision. Actual PC vision and light sources determine what each player sees.

## Fog and darkness

- Village: shared fog, token vision, global light on, darkness 0.10.
- Forest: shared fog, token vision, global light on, darkness 0.18.
- Cave: shared fog, token vision, global light off, darkness 0.88.
- Unexplored rooms remain concealed.
- Hostile tokens are staged hidden.
- Scratch-Scratch begins hidden in the unlit Old Shrine.

## Five-PC encounter tuning

- Forest: 3 Beginner Goblins.
- Entrance: 2 goblins; intended as stealth/social-capable.
- Common Room: 3 goblins; a fourth is available as reinforcement.
- Grikka: Grikka + 1 goblin if combat occurs.
- Finale: Scratch-Scratch + 1 rat. Reveal the second rat only if the group is doing well.
- If the party struggles, reduce Scratch-Scratch to 22 HP.

## Bell rule

A creature holding the Bell may use an Action to ring it. Scratch-Scratch makes a DC 12 Wisdom save. On a failure, it is Frightened of the bell-ringer until the end of its next turn. Once Scratch-Scratch succeeds on the save, it has advantage on later Bell saves.

## SRD cloning

At installation the module searches installed Actor compendia for:

- Goblin
- Giant Rat
- Giant Spider

It clones them into the world so attacks and activities come from the current D&D5e system, then applies the Briar Glen names and HP. If a source Actor cannot be found, it creates a minimal fallback NPC and logs a warning.

## Map status

The included PNGs are **functional blocking maps**, not the final art pass. They are intentionally 4000×3000 and already aligned to all walls, lights, notes, and token positions. Final illustrated maps can replace the PNGs later without changing scene geometry as long as they remain 4000×3000.


## NPC Portraits and Tokens

Version 0.3 adds a consistent portrait/token art set for:

- Reeve Mara Thistlebrook
- Brother Alden
- Tobbin Reed
- Grikka One-Ear
- Beginner Goblin
- Giant Rat
- Scratch-Scratch

Mara, Alden, and Tobbin are now full Foundry NPC Actors and are pre-positioned in Briar Glen. Grikka and all combat creatures use matching portrait and prototype-token artwork.

Portrait files live in:
`assets/actors/portraits/`

Round transparent token files live in:
`assets/actors/tokens/`

The five player characters remain intentionally absent and can be imported or created independently.


## v0.4 GM & Player Handout Upgrade

This version adds a dedicated **Briar Glen - Player Handouts** journal folder. Handouts are created with default Observer permission so players can read them without seeing the GM guide.

Player handouts:
- Reeve Mara's Request
- Tobbin's Account
- The Bell of Saint Arlen
- Crowned Raven Map (with image)
- What We Know clue sheet

GM tools:
- NPC Roleplaying & Dialogue journal page
- Goblin Chatter roll table
- Briar Glen Festival Details roll table
- Cave Discoveries roll table
- Old Shrine Treasure loot actor where supported

**Spoiler handling:** Do not show the Crowned Raven Map or the full What We Know sheet before the corresponding clues have been discovered. Foundry permissions make the handouts readable, but the GM controls when to actually open/show them.


## v0.5 GM Control Upgrade

Added:
- GM Dashboard journal with the entire session flow on one page
- Reveal Selected Tokens macro
- Hide Selected Tokens macro
- Ring the Bell macro
- Easy Boss (22 HP) macro
- Standard Boss (30 HP) macro
- Reset Fog macro
- GM-only cave hazard/treasure map notes
- Player handout: Exploring in Darkness
- Player handout: Goblin's Warning

### Suggested hotbar
Drag these macros to the GM hotbar before play:
1. BG - Reveal Selected Tokens
2. BG - Hide Selected Tokens
3. BG - Ring the Bell
4. BG - Easy Boss
5. BG - Standard Boss
6. BG - Reset Fog

The Bell macro intentionally posts the mechanic to chat instead of forcing a system-specific effect. This keeps the adventure stable across D&D5e 6.x updates while making the rule immediately visible to the table.


## v0.6 Sound & Atmosphere Upgrade

This version adds an original, royalty-free ambient audio layer created specifically for the module:

- BG - Village & Festival
- BG - Forest
- BG - Cave
- BG - Scratch-Scratch
- BG - Victory

Each playlist contains a looping local WAV file, so the adventure does not depend on streaming services, external URLs, or copyrighted soundtrack files.

### Scene-transition macros

Seven new GM macros activate the matching theater-of-the-mind scene and post short read-aloud narration to chat:

- BG - Opening
- BG - Journey to Crow's Tooth
- BG - Enter the Cave
- BG - Grikka Parley
- BG - Shrine Reveal
- BG - Scratch-Scratch Reveal
- BG - Finale

Audio play/stop macros are also created. This intentionally keeps soundtrack control in the GM's hands instead of forcing audio whenever a scene activates.

### Recommended flow

Opening → play Village audio  
Journey → stop Village, play Forest  
Cave → stop Forest, play Cave  
Scratch-Scratch reveal → stop Cave, play Scratch-Scratch  
Finale → stop boss audio, play Victory

The included sounds are deliberately subtle ambience rather than full musical compositions, so narration and beginner table conversation remain clear.


## v0.7 Final Battlemaps + Interactive Exploration

### Final battlemap art
The temporary blocking maps have been replaced with illustrated top-down fantasy art for:
- Briar Glen
- Forest Trail
- Crooked Fang Cave

All three remain 4000×3000 so the Foundry scene setup, fog, lighting, token positions, and automation continue to use the established scene dimensions.

### Interactive cave
Added:
- Six dedicated keyed-room GM journals
- Clickable cave journal pins for Rooms 1–6
- Tripwire Discovered macro
- Tripwire Triggered macro
- Search Webbed Pouch macro
- Open Shrine Chest macro
- Goblin Surrenders macro
- Reveal Second Rat macro
- Existing fog, darkness, walls, local lighting, hidden enemies, treasure, audio, scene transitions, and Bell controls remain in place

### Player handouts
All player handouts from earlier builds remain included:
- Reeve Mara's Request
- Tobbin's Account
- The Bell of Saint Arlen
- Crowned Raven Map
- What We Know
- Exploring in Darkness
- Goblin's Warning

The five player characters are still intentionally external to the module and can be created/imported after installation.
