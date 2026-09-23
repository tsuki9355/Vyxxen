export const RULES = Object.freeze({
  length: 6600, checkpoints: [2200, 4400], cruise: 20, slow: 8,
  minAltitude: 2.6, maxAltitude: 24, lowAltitude: 7,
  lane: 31, fuelDrain: 1.45, refillRate: 50, respawnShield: 2,
});
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const routeZ = (progress, x = 0) => -progress - x * (2 / 3);
export const formatTime = seconds => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
export function createRun() {
  return { progress: 0, x: 0, altitude: 11, fuel: 100, lives: 3, score: 0,
    elapsed: 0, destroyed: 0, spread: false, checkpoint: 0, invulnerable: 2,
    shotCooldown: 0, refueling: false, speed: RULES.cruise, status: 'playing' };
}
export function updateFuel(fuel, dt, refueling, shield = 0) {
  return clamp(fuel + (refueling ? RULES.refillRate : shield > 0 ? 0 : -RULES.fuelDrain) * dt, 0, 100);
}
export function advanceCheckpoint(run) {
  const next = RULES.checkpoints.filter(p => run.progress >= p).at(-1) ?? 0;
  if (next > run.checkpoint) { run.checkpoint = next; return true; }
  return false;
}
export function loseLife(run) {
  run.lives--;
  run.spread = false;
  run.refueling = false;
  if (run.lives <= 0) { run.status = 'lost'; return false; }
  run.progress = run.checkpoint;
  run.x = 0;
  // Each checkpoint has a safe pad underneath it, including departure.
  // A dry tank can begin refilling during the two-second respawn shield.
  run.altitude = run.fuel < 8 ? 4 : 11;
  run.invulnerable = RULES.respawnShield;
  return true;
}
export function shotDirections(spread) {
  const angles = spread ? [0, -22, 22] : [0];
  return angles.map(degrees => ({ x: Math.sin(degrees * Math.PI / 180), z: -Math.cos(degrees * Math.PI / 180) }));
}
export function intersectsBox(point, box, margin = 0) {
  return Math.abs(point.x - box.x) < box.w / 2 + margin &&
    Math.abs(point.z - box.z) < box.d / 2 + margin &&
    point.y > box.bottom - margin && point.y < box.top + margin;
}
export function selectPickups(candidates, random = Math.random) {
  // One curated location per section. Their activation windows never overlap.
  return [0, 1, 2].map(section => {
    const options = candidates.filter(p => p.section === section);
    return { ...options[Math.min(options.length - 1, Math.floor(random() * options.length))] };
  });
}
