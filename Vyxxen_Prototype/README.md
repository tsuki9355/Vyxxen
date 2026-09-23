# VYXXEN — Offshore Run

A playable Three.js prototype based on [`design.md`](../design.md). Pilot a low-poly interceptor through an authored offshore course: clear threats, skim oil-platform pads for fuel, and make it to the final runway.

## Run locally

Requires **Node.js 20.19+ or 22.12+** and a desktop browser with WebGL 2 support.

From the repository root, enter the prototype folder first:

```sh
cd Vyxxen_Prototype
```

Run all project commands from this folder.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally **http://127.0.0.1:5173**). Launch with **Enter** or **Launch Mission**. The game must be served through Vite or a web server; opening `index.html` directly will not work.

```sh
npm run build       # Production files in dist/
npm run preview     # Serve the production build locally
```

## Controls

| Action | Keyboard | Standard gamepad |
| --- | --- | --- |
| Move left / right | A / D or ← / → | Left stick horizontal |
| Raise / lower altitude | W / S or ↑ / ↓ | Left stick vertical |
| Fire continuously | Hold Space | Hold primary face button (A / Cross) |
| Slow forward flight | Hold Shift | Hold either trigger |
| Pause / resume | Esc or P | Start / Menu |
| Launch / replay | Enter or on-screen button | Start / Menu |

The top-right sound button mutes the synthesized engine and effects. Audio starts after a user interaction. If a controller is not detected, press one of its buttons while the page is focused. Losing browser focus automatically pauses the run.

## Flying the mission

- **Three sectors, two checkpoints, three lives.** The 6,600-unit route takes 5½ minutes at cruise speed, plus refueling and any time spent slowing or replaying after a death.
- **Continuous forward flight.** Left/right is screen-relative; up/down changes altitude. The left-side instrument marks low, mid, and high bands. Edge beacons show the gently constrained flight corridor.
- **Manage your fuel.** A full tank lasts about 69 seconds. Green platforms are spaced approximately 35–42 seconds apart at cruise. Line up with the marked pad, descend into the low band, and the ship automatically hovers and refuels. An empty tank fills in two seconds. Move sideways or climb to leave early with a partial refill; a full tank releases the hover automatically.
- **Clear a path.** Orange turrets fire slow aimed rounds. Their visible energy masts can be hit from any altitude band. Interceptors make crossing passes without shooting. Orange cargo crates are optional destructible targets. Gray towers and striped barriers are solid, indestructible hazards; platforms are safe.
- **Collect violet diamonds.** Fly through one to add two shots at ±22° to the central shot. Three curated pickup locations are selected per run, one in each sector; only one pickup is active at a time. The upgrade lasts until death.
- **Recover at checkpoints.** A collision, hostile round, interceptor, or empty tank costs a life. After a brief explosion, the ship returns to the last checkpoint with its remaining fuel and two seconds of invulnerability. Each checkpoint has a safe pad, so a dry-tank respawn starts low enough to refill instead of becoming trapped in repeated immediate deaths.
- **Reach the runway.** Turrets award 150 points, interceptors 250, cargo 100, and mission completion 1,000. Results show completion status, score, active flight time, and targets destroyed.

### Design interpretations

`design.md` specifies both preserving the weapon state on respawn and losing the three-way upgrade on destruction. This prototype follows the explicit pickup rule: **death resets the weapon to single shot**, while preserving fuel. Fuel drain is suspended during the respawn shield, and empty-tank respawns are placed over a checkpoint pad.

Destroyed targets and collected pickups stay consumed for the current run, including after a checkpoint respawn. Surviving enemies ahead of the checkpoint are rearmed. Restarting fully resets the mission and selects new pickup positions. Paused time is excluded from results.

## Checks

```sh
npm test                    # Core rules: fuel, lives, checkpoints, shots, course
npx playwright install chromium
npm run test:browser         # Actual WebGL browser integration and UI checks
```

The browser suite covers keyboard flight and pause/restart, simulated standard-gamepad input, refueling, pickups, target damage, checkpoint recovery, fuel depletion, game over, completion, and short desktop layouts. It launches its own Vite server and captures title/flight screenshots in the ignored `test-results/` directory. Physical-controller feel still benefits from hands-on playtesting.

## Project map

| File | Purpose |
| --- | --- |
| `src/game.js` | Game loop, input, combat, lifecycle, and HUD |
| `src/world.js` | Three.js scene, original procedural models, lighting, effects |
| `src/course.js` | Fixed authored hazards, platforms, enemies, pickup candidates |
| `src/rules.js` | Shared tuning constants and testable game rules |
| `src/audio.js` | Lightweight synthesized engine and event sounds |
| `src/style.css` | Title screen, flight instruments, and results styling |
| `tests/` | Rules and browser integration tests |

All game geometry, markings, textures, and audio are generated in code. UI fonts are loaded from Google Fonts with local fallback stacks. No external art assets, backend, accounts, or save storage are required.
