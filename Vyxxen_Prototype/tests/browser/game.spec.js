import { test, expect } from '@playwright/test';

test('rendered title, keyboard flight, fire, slow, pause and restart',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page.locator('#scene canvas')).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:testInfo.outputPath('title.png')});
  await page.keyboard.press('Enter');await expect(page.locator('#hud')).toBeVisible();
  await page.keyboard.down('KeyD');await page.keyboard.down('KeyW');await page.keyboard.down('Space');await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(600);
  const active=await page.evaluate(async()=>{const {game}=await import('/src/main.js');return{x:game.run.x,y:game.run.altitude,progress:game.run.progress,speed:game.run.speed,bullets:game.bullets.length};});
  expect(active.x).toBeGreaterThan(0);expect(active.y).toBeGreaterThan(11);expect(active.progress).toBeGreaterThan(0);expect(active.speed).toBe(8);expect(active.bullets).toBeGreaterThan(0);
  for(const key of ['KeyD','KeyW','Space','ShiftLeft'])await page.keyboard.up(key);
  await page.keyboard.press('Escape');await expect(page.locator('#pause-screen')).toBeVisible();
  const before=await page.evaluate(async()=>(await import('/src/main.js')).game.run.progress);
  await page.waitForTimeout(200);
  expect(await page.evaluate(async()=>(await import('/src/main.js')).game.run.progress)).toBe(before);
  await page.getByRole('button',{name:'RESUME FLIGHT'}).click();await expect(page.locator('#pause-screen')).toBeHidden();
  await page.screenshot({path:testInfo.outputPath('flight.png')});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'RESTART MISSION'}).click();
  await expect(page.locator('#score')).toHaveText('000000');expect(errors).toEqual([]);
});

test('fuel pad hovers, provides partial fuel, fills and releases the ship',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'LAUNCH MISSION'}).click();
  const result=await page.evaluate(async()=>{
    const {game}=await import('/src/main.js');game.pause(true);
    Object.assign(game.run,{progress:750,x:12,altitude:4,fuel:10,invulnerable:0});
    const input={x:0,y:0,fire:false,slow:false};
    for(let i=0;i<60;i++)game.update(1/120,input);
    const partial={fuel:game.run.fuel,progress:game.run.progress,refueling:game.run.refueling};
    for(let i=0;i<180;i++)game.update(1/120,input);
    return{partial,fuel:game.run.fuel,progress:game.run.progress,serviced:game.course.pads[1].serviced};
  });
  expect(result.partial.fuel).toBeCloseTo(35,1);expect(result.partial.progress).toBe(750);expect(result.partial.refueling).toBe(true);
  expect(result.fuel).toBeGreaterThan(99);expect(result.progress).toBeGreaterThan(750);expect(result.serviced).toBe(true);
});

test('pickup grants three projectiles; shots destroy targets and award score',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'LAUNCH MISSION'}).click();
  const result=await page.evaluate(async()=>{
    const {game}=await import('/src/main.js');game.pause(true);
    const {routeZ}=await import('/src/rules.js');const vector=(x,y,z)=>game.world.ship.position.clone().set(x,y,z);
    const input={x:0,y:0,fire:false,slow:false};
    const pickup=game.course.pickups[0];Object.assign(game.run,{progress:pickup.p,x:pickup.x,altitude:pickup.y});game.update(1/120,input);
    game.clearBullets();game.fire(vector(0,11,0));const count=game.bullets.length;game.clearBullets();
    const target=game.course.targets.find(t=>t.type==='turret');Object.assign(game.run,{progress:target.p-30,x:target.x,altitude:11,invulnerable:3});
    const position=vector(game.run.x,11,routeZ(game.run.progress,game.run.x));
    game.fire(position);game.fire(position);
    for(let i=0;i<100;i++)game.updateBullets(1/120,position);
    return{spread:game.run.spread,collected:pickup.collected,count,destroyed:target.destroyed,score:game.run.score,targets:game.run.destroyed};
  });
  expect(result).toEqual({spread:true,collected:true,count:3,destroyed:true,score:150,targets:1});
});

test('terrain impact respawns at checkpoint and fuel depletion can recover safely',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'LAUNCH MISSION'}).click();
  const result=await page.evaluate(async()=>{
    const {game}=await import('/src/main.js');game.pause(true);const input={x:0,y:0,fire:false,slow:false};
    const target=game.course.targets.find(t=>t.type==='tower'&&t.p>2200);
    Object.assign(game.run,{progress:target.p,checkpoint:2200,x:target.x,altitude:4,invulnerable:0,fuel:40,spread:true});
    game.update(1/120,input);const impact=game.deathTimer>0;
    for(let i=0;i<121;i++)game.update(1/120,input);
    const respawn={lives:game.run.lives,progress:game.run.progress,fuel:game.run.fuel,spread:game.run.spread,shield:game.run.invulnerable};
    Object.assign(game.run,{fuel:0,invulnerable:0,progress:2500,altitude:11,x:0});game.update(1/120,input);
    for(let i=0;i<180;i++)game.update(1/120,input);
    return{impact,respawn,recovered:game.run.fuel>0,lives:game.run.lives,altitude:game.run.altitude};
  });
  expect(result.impact).toBe(true);expect(result.respawn.lives).toBe(2);expect(result.respawn.progress).toBeCloseTo(2200,0);
  expect(result.respawn.fuel).toBeCloseTo(40,1);expect(result.respawn.spread).toBe(false);expect(result.respawn.shield).toBeGreaterThan(1.9);
  expect(result.recovered).toBe(true);expect(result.lives).toBe(1);expect(result.altitude).toBe(4);
});

test('crossing the runway and exhausting lives show the correct results',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'LAUNCH MISSION'}).click();
  await page.evaluate(async()=>{const {game}=await import('/src/main.js');game.pause(true);Object.assign(game.run,{progress:6599.95,elapsed:335,score:500,altitude:20,fuel:50});game.update(.01,{x:0,y:0,fire:false,slow:false});});
  await expect(page.locator('#results-screen')).toBeVisible();await expect(page.locator('#result-eyebrow')).toContainText('COMPLETE');await expect(page.locator('#result-score')).toHaveText('1,500');await expect(page.locator('#result-time')).toHaveText('05:35');
  await page.getByRole('button',{name:'FLY AGAIN'}).click();
  await page.evaluate(async()=>{const {game}=await import('/src/main.js');game.pause(true);Object.assign(game.run,{lives:1,invulnerable:0});game.die('TEST IMPACT');for(let i=0;i<121;i++)game.update(1/120,{x:0,y:0,fire:false,slow:false});});
  await expect(page.locator('#result-eyebrow')).toHaveText('TRANSMISSION ENDED');await page.getByRole('button',{name:'BACK TO BASE'}).click();await expect(page.locator('#title-screen')).toBeVisible();
});

test('standard gamepad can launch, steer, fire, slow and pause',async({page})=>{
  await page.addInitScript(()=>{
    window.mockPad={connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.mockPad]});
  });
  await page.goto('/');await expect(page.locator('#gamepad-label')).toHaveText('GAMEPAD CONNECTED');
  await page.evaluate(()=>{window.mockPad.buttons[9].pressed=true;});await expect(page.locator('#hud')).toBeVisible();
  await page.evaluate(()=>{window.mockPad.buttons[9].pressed=false;window.mockPad.axes=[.8,-.6];window.mockPad.buttons[0].pressed=true;window.mockPad.buttons[7].value=.9;});
  await page.waitForTimeout(450);
  const state=await page.evaluate(async()=>{const {game}=await import('/src/main.js');return{x:game.run.x,y:game.run.altitude,speed:game.run.speed,shots:game.bullets.length};});
  expect(state.x).toBeGreaterThan(0);expect(state.y).toBeGreaterThan(11);expect(state.speed).toBe(8);expect(state.shots).toBeGreaterThan(0);
  await page.evaluate(()=>{window.mockPad.buttons[9].pressed=true;});await expect(page.locator('#pause-screen')).toBeVisible();
});

test('launch controls remain clear of the footer in shorter desktop windows',async({page})=>{
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  for(const height of [720,600]){
    await page.setViewportSize({width:1280,height});
    const bounds=await page.evaluate(()=>{
      const footer=document.querySelector('.controls-bar').getBoundingClientRect();
      const copy=document.querySelector('.title-copy').getBoundingClientRect();
      const launch=document.getElementById('start-button').getBoundingClientRect();
      return{copyBottom:copy.bottom,footerTop:footer.top,launchBottom:launch.bottom};
    });
    expect(bounds.copyBottom).toBeLessThan(bounds.footerTop);expect(bounds.launchBottom).toBeLessThan(bounds.footerTop);
  }
});
