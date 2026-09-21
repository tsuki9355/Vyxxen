# Vyxxen Prototype Design

## Goal

Build a quick Three.js desktop-browser vertical slice: one polished, replayable Zaxxon-inspired mission that proves continuous isometric flight, route-clearing combat, oil-platform refueling, and the three-way-shot pickup.

The game is an original, readable low-poly arcade homage with stylized visuals, rather than a faithful visual recreation.

## Scope

Included:

- One authored 5-7 minute scrolling course.
- Three course sections, separated by two checkpoints.
- Keyboard and gamepad support.
- Flight, combat, fuel, refueling, the three-way-shot pickup, lives, score, and a basic game shell.

Explicitly out of scope unless required to validate the core loop:

- Multiple missions, progression, story, save data, leaderboards, settings, control rebinding, accessibility menus, and tutorial flows.
- Audio polish, a full music/soundscape pass, advanced scoring, combos, rankings, radar, and procedural course generation.

## Player And Controls

- The ship advances continuously through the course.
- Movement is screen-relative: the player controls horizontal and vertical movement while the route scrolls forward.
- Keyboard: `WASD` or arrow keys move, `Space` fires, and `Shift` slows.
- Gamepad: left stick moves, primary face button fires, and a trigger slows.
- Holding slow reduces forward motion to a fixed lower cruise speed. Lateral and vertical responsiveness remain normal.
- The camera is a fixed three-quarter elevated view that follows forward progress and looks slightly ahead of the ship.
- Soft, visibly communicated course bounds gently constrain the player before they leave the playable area.

## Route And Flight

- Use three broad altitude bands rather than precision flight physics:
  - Low: oil-platform hovering and low barriers.
  - Mid: normal cruise altitude.
  - High: clearing tall structures.
- Core terrain hazards are low barriers, tall structures, and narrow route passages.
- Terrain and obstacle collisions immediately destroy the ship.
- The course is fully authored and repeatable. Only weapon-pickup spawn selection varies between runs.

## Mission Flow

The mission has three escalating sections:

1. Teach movement and static turrets.
2. Introduce aerial interceptors and meaningful refueling pressure.
3. Combine hazards densely for the final runway.

The mission ends when the player crosses the runway finish. Completion shows a compact results screen with completion status, score, time, and targets destroyed.

## Lives, Death, And Checkpoints

- The player starts with three lives.
- The course has two checkpoints: one after the early section and one after the middle section.
- Any terrain collision, enemy projectile hit, interceptor collision, or fuel depletion immediately destroys the ship and costs one life.
- The player respawns at the latest checkpoint with the fuel and weapon state held at death.
- Respawn grants two seconds of invulnerability to prevent repeated deaths from overlapping hazards.
- Losing all lives ends the run; the game-over results screen provides restart.

## Combat

- Holding fire produces a steady standard-shot stream with a short readable cooldown.
- Combat is primarily for clearing threats and making safe routes; score is secondary feedback.
- Static ground turrets fire slow, clearly visible aimed projectiles.
- Aerial interceptors spawn ahead of or beside the ship, make a short route-crossing pass, and leave if not destroyed. They threaten through contact and do not shoot.
- Both weapon types damage turrets, interceptors, and designated destructible route targets.
- Terrain and oil platforms are indestructible.
- Optional destructible structures can award score but never affect refueling or route progression.

## Weapon Pickup

- The base weapon fires straight ahead.
- A collectible upgrades it to a three-way shot: one straight projectile plus two diagonal projectiles at 22 degrees, aligned with the main shot.
- The upgrade lasts until the ship is destroyed.
- Pickups appear at two or three curated valid locations selected randomly per run, with at most one active pickup at a time.
- Collect a pickup by flying through its floating, rotating model.
- The pickup uses a distinct color and has brief HUD and on-ship confirmation feedback.

## Fuel And Oil Platforms

- Fuel drains steadily over time during normal flight.
- Fuel reaching zero immediately destroys the ship.
- Oil platforms are the only reliable fuel refill source.
- To refuel, hover over a marked platform pad within the low altitude band. Refueling begins automatically, takes about two seconds to fill completely, and grants partial fuel if the player leaves early.
- Platforms are safe. Nearby route hazards and overall fuel pressure create their challenge.

## HUD, Feedback, And Shell

- Always show lives, fuel, score, three-way-shot status, and minimal runway-progress information.
- Score is visible but limited to destroyed targets and mission completion. Do not add combos, multipliers, or ranks.
- Include essential audiovisual feedback only: engine, shot, hit, refuel, and pickup sounds; simple explosions; and clear particle or color feedback.
- Required screens: title/start, gameplay HUD, pause/restart control, game-over results, and completion results.
