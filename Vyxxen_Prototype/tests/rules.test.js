import test from 'node:test';
import assert from 'node:assert/strict';
import { RULES, createRun, updateFuel, advanceCheckpoint, loseLife, shotDirections, intersectsBox, routeZ } from '../src/rules.js';
import { createCourse } from '../src/course.js';

test('checkpoints advance only after their boundary and cannot regress',()=>{
  const run=createRun();run.progress=2199;assert.equal(advanceCheckpoint(run),false);
  run.progress=2200;assert.equal(advanceCheckpoint(run),true);assert.equal(run.checkpoint,2200);
  run.progress=1500;assert.equal(advanceCheckpoint(run),false);assert.equal(run.checkpoint,2200);
  run.progress=4401;assert.equal(advanceCheckpoint(run),true);assert.equal(run.checkpoint,4400);
});
test('death costs a life, preserves fuel and returns to checkpoint with a shield',()=>{
  const run=createRun();Object.assign(run,{checkpoint:2200,progress:3300,fuel:35,spread:true,score:500});
  assert.equal(loseLife(run),true);assert.equal(run.lives,2);assert.equal(run.progress,2200);
  assert.equal(run.fuel,35);assert.equal(run.score,500);assert.equal(run.spread,false);assert.equal(run.invulnerable,2);
  loseLife(run);assert.equal(loseLife(run),false);assert.equal(run.status,'lost');
});
test('a dry-tank respawn is inside a safe fuel pad at every checkpoint',()=>{
  const course=createCourse();
  for(const checkpoint of [0,...RULES.checkpoints]){
    const run=createRun();Object.assign(run,{checkpoint,fuel:0});loseLife(run);
    const pad=course.pads.find(p=>p.p===checkpoint);
    assert.ok(pad);assert.ok(Math.abs(run.x-pad.x)<9);assert.ok(Math.abs(routeZ(run.progress,run.x)-pad.z)<36);
    assert.ok(run.altitude<=RULES.lowAltitude);assert.equal(updateFuel(0,2,true),100);
  }
});
test('fuel drains by time, refill is capped and fills an empty tank in two seconds',()=>{
  assert.equal(updateFuel(100,10,false),85.5);assert.equal(updateFuel(5,10,false),0);
  assert.equal(updateFuel(0,1,true),50);assert.equal(updateFuel(0,2,true),100);
  assert.equal(updateFuel(80,1,true),100);assert.equal(updateFuel(20,1,false,2),20);
});
test('three-way shots have unit direction and exact symmetric 22-degree spread',()=>{
  assert.deepEqual(shotDirections(false),[{x:0,z:-1}]);const directions=shotDirections(true);
  assert.equal(directions.length,3);assert.equal(directions[1].x,-directions[2].x);
  for(const d of directions)assert.ok(Math.abs(Math.hypot(d.x,d.z)-1)<1e-10);
  assert.ok(Math.abs(Math.atan2(directions[2].x,-directions[2].z)*180/Math.PI-22)<1e-10);
});
test('pickup randomness only selects from curated points; route geometry stays fixed',()=>{
  const a=createCourse(()=>0),b=createCourse(()=>.999);
  assert.deepEqual(a.targets,b.targets);assert.deepEqual(a.pads,b.pads);assert.notDeepEqual(a.pickups,b.pickups);
  for(const course of [a,b]){
    assert.equal(course.pickups.length,3);
    assert.deepEqual(course.pickups.map(p=>p.section),[0,1,2]);
    for(let i=1;i<3;i++)assert.ok(course.pickups[i].p-course.pickups[i-1].p>150);
  }
});
test('course supports a five-to-seven minute cruise and fuel-safe pad spacing',()=>{
  assert.ok(RULES.length/RULES.cruise>=300&&RULES.length/RULES.cruise<=420);
  const pads=createCourse().pads;
  for(let i=1;i<pads.length;i++)assert.ok((pads[i].p-pads[i-1].p)/RULES.cruise*RULES.fuelDrain<75);
});
test('collision volume checks altitude as well as horizontal position',()=>{
  const b={x:0,z:0,w:10,d:10,bottom:0,top:8};
  assert.equal(intersectsBox({x:0,y:4,z:0},b),true);
  assert.equal(intersectsBox({x:0,y:10,z:0},b),false);
  assert.equal(intersectsBox({x:6,y:4,z:0},b),false);
});
