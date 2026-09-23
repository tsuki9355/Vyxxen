import * as THREE from 'three';
import { RULES, clamp, routeZ, createRun, updateFuel, advanceCheckpoint, loseLife, shotDirections, intersectsBox, formatTime } from './rules.js';
import { createCourse, SECTORS } from './course.js';
import { AudioSystem } from './audio.js';
import { World } from './world.js';

const $ = id => document.getElementById(id);
const show = (id,visible) => $(id).classList.toggle('hidden',!visible);
export class Game {
  constructor() {
    this.world=new World($('scene'));this.audio=new AudioSystem();
    this.keys=new Set();this.run=createRun();this.mode='title';this.course=createCourse();
    this.world.buildCourse(this.course);this.bullets=[];this.clock=0;this.noticeTime=0;this.refuelSound=0;
    this.padStartWasDown=false;this.bindControls();this.updateHUD();
    this.lastTime=performance.now();this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
  }
  bindControls() {
    $('start-button').onclick=()=>this.start();$('replay-button').onclick=()=>this.start();
    $('restart-button').onclick=()=>this.start();$('resume-button').onclick=()=>this.pause(false);
    $('pause-button').onclick=()=>this.pause(true);$('home-button').onclick=()=>this.home();
    $('sound-button').onclick=()=>{
      this.audio.unlock();const enabled=this.audio.toggle();$('sound-label').textContent=enabled?'ON':'OFF';
      $('sound-button').setAttribute('aria-label',enabled?'Mute sound':'Enable sound');
    };
    const keys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'];
    window.addEventListener('keydown',event=>{
      if(keys.includes(event.code)){event.preventDefault();this.keys.add(event.code);}
      if(event.repeat)return;
      if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();if(this.mode==='playing'||this.mode==='paused')this.pause(this.mode==='playing');}
      if(event.code==='Enter'&&event.target.tagName!=='BUTTON'&&event.target.tagName!=='A'){
        event.preventDefault();if(this.mode==='title'||this.mode==='results')this.start();else if(this.mode==='paused')this.pause(false);
      }
    });
    window.addEventListener('keyup',event=>this.keys.delete(event.code));
    window.addEventListener('blur',()=>{this.keys.clear();if(this.mode==='playing')this.pause(true);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.mode==='playing')this.pause(true);});
  }
  start() {
    this.audio.unlock();this.keys.clear();this.run=createRun();this.course=createCourse();
    this.world.buildCourse(this.course);this.bullets=[];this.deathTimer=0;this.refuelSound=0;this.lowFuelWarned=false;
    this.wasRefueling=false;this.mode='playing';this.setScreen();this.notify('OFFSHORE RUN / CLEAR FOR DEPARTURE',4);this.updateHUD();
    document.activeElement?.blur();
  }
  home() {this.mode='title';this.run=createRun();this.course=createCourse();this.world.buildCourse(this.course);this.bullets=[];this.audio.flight(false);this.setScreen();}
  setScreen() {
    show('title-screen',this.mode==='title');show('hud',this.mode==='playing'||this.mode==='paused');
    show('pause-screen',this.mode==='paused');show('results-screen',this.mode==='results');
    document.body.classList.toggle('playing',this.mode!=='title');
    if(this.mode==='paused')$('resume-button').focus();
    if(this.mode==='results')$('replay-button').focus();
  }
  pause(paused) {
    if(!['playing','paused'].includes(this.mode))return;
    this.mode=paused?'paused':'playing';this.keys.clear();this.audio.flight(!paused);this.setScreen();
    if(!paused){this.audio.unlock();document.activeElement?.blur();}
  }
  notify(text,duration=3,color='') {
    $('notice').textContent=text;$('notice').style.color=color;$('notice').style.borderColor=color;
    $('notice').classList.add('visible');this.noticeTime=duration;
  }
  input() {
    const pressed=(...keys)=>keys.some(key=>this.keys.has(key));
    let x=Number(pressed('KeyD','ArrowRight'))-Number(pressed('KeyA','ArrowLeft'));
    let y=Number(pressed('KeyW','ArrowUp'))-Number(pressed('KeyS','ArrowDown'));
    let fire=pressed('Space'),slow=pressed('ShiftLeft','ShiftRight');
    const pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);
    if(pad){
      const deadzone=v=>Math.abs(v)>.16?(v-Math.sign(v)*.16)/.84:0;
      x=clamp(x+deadzone(pad.axes[0]||0),-1,1);y=clamp(y-deadzone(pad.axes[1]||0),-1,1);
      fire ||= !!pad.buttons[0]?.pressed;slow ||= (pad.buttons[6]?.value||0)>.25||(pad.buttons[7]?.value||0)>.25;
      const start=!!pad.buttons[9]?.pressed;
      if(start&&!this.padStartWasDown){
        if(this.mode==='title'||this.mode==='results')this.start();else this.pause(this.mode==='playing');
      }
      this.padStartWasDown=start;
    }else this.padStartWasDown=false;
    $('gamepad-dot').style.background=pad?'#91ecc3':'';$('gamepad-label').textContent=pad?'GAMEPAD CONNECTED':'GAMEPAD READY';
    return {x,y,fire,slow};
  }
  frame(now) {
    const dt=Math.min((now-this.lastTime)/1000,.05);this.lastTime=now;
    const input=this.input();
    if(this.mode==='playing') {
      // Small substeps keep shots and collision checks reliable on slower displays.
      let remaining=dt;
      while(remaining>0&&this.mode==='playing'){const step=Math.min(remaining,1/120);this.update(step,input);remaining-=step;}
      this.noticeTime-=dt;if(this.noticeTime<=0)$('notice').classList.remove('visible');this.updateHUD();
    }
    if(this.mode==='playing'||this.mode==='title')this.clock+=dt;
    this.audio.flight(this.mode==='playing'&&!this.deathTimer,input.slow||this.run.refueling);
    this.world.render(this.run,this.course,this.clock,this.mode==='paused'?0:dt,this.mode==='title');
    requestAnimationFrame(this.frame);
  }
  update(dt,input) {
    const run=this.run;run.elapsed+=dt;
    if(this.deathTimer>0){
      this.deathTimer-=dt;
      if(this.deathTimer<=0){
        this.deathTimer=0;run.dying=false;
        if(!loseLife(run)){this.finish(false);return;}
        this.clearBullets();
        for(const enemy of this.course.targets){
          if(enemy.p>=run.checkpoint){enemy.active=false;enemy.escaped=false;enemy.cooldown=1.5;}
        }
        for(const pad of this.course.pads)if(pad.p>=run.checkpoint)pad.serviced=false;
        this.lowFuelWarned=false;this.notify(`CHECKPOINT RESTORED / ${run.lives} ${run.lives===1?'LIFE':'LIVES'} REMAIN`,3,'#ffb087');
      }
      return;
    }
    run.invulnerable=Math.max(0,run.invulnerable-dt);
    run.moveX=input.x;run.moveY=input.y;
    // Compress lateral response over the last four units for a soft boundary.
    const boundary= Math.sign(input.x)===Math.sign(run.x) ? clamp((RULES.lane-Math.abs(run.x))/4,.12,1) : 1;
    run.x=clamp(run.x+input.x*22*boundary*dt,-RULES.lane,RULES.lane);
    run.altitude=clamp(run.altitude+input.y*14*dt,RULES.minAltitude,RULES.maxAltitude);
    const position=new THREE.Vector3(run.x,run.altitude,routeZ(run.progress,run.x));
    const pad=this.course.pads.find(p=>!p.serviced&&intersectsBox(position,p.box)&&run.altitude<=RULES.lowAltitude);
    run.refueling=!!pad&&run.fuel<99.99;
    if(run.refueling&&!this.wasRefueling){this.notify('PAD CONTACT / HOLD LOW TO REFUEL',2);this.refuelSound=0;}
    run.speed=run.refueling?0:input.slow?RULES.slow:RULES.cruise;
    run.progress+=run.speed*dt;
    run.fuel=updateFuel(run.fuel,dt,run.refueling,run.invulnerable);
    if(run.refueling){
      this.refuelSound-=dt;if(this.refuelSound<=0){this.audio.refuel();this.refuelSound=.22;}
      if(run.fuel>=99.99){pad.serviced=true;this.notify('TANK FULL / CLEAR TO DEPART',2);this.lowFuelWarned=false;}
    }
    this.wasRefueling=run.refueling;
    if(run.fuel<23&&!this.lowFuelWarned){this.lowFuelWarned=true;this.notify('FUEL LOW / SEEK A GREEN PAD',4,'#ffb087');}
    if(run.fuel<=0&&run.invulnerable<=0){this.die('FUEL DEPLETED');return;}
    if(advanceCheckpoint(run)){this.notify(`CHECKPOINT ${run.checkpoint===2200?'01':'02'} / ${SECTORS[run.checkpoint/2200].toUpperCase()}`,4);this.audio.pickup();}
    if(run.progress>=RULES.length){this.finish(true);return;}
    run.shotCooldown-=dt;
    if(input.fire&&run.shotCooldown<=0){this.fire(position);run.shotCooldown=.14;}
    this.updateEnemies(dt,position);
    if(this.deathTimer)return;
    this.updateBullets(dt,position);
    if(this.deathTimer)return;
    for(const item of this.course.targets){
      if(item.destroyed||Math.abs(item.p-run.progress)>65)continue;
      if(item.box&&run.invulnerable<=0){
        // The turret's thin energy mast takes shots but only the base is solid.
        const solid=item.type==='turret'?{...item.box,w:7,d:8,top:6.5}:item.box;
        if(intersectsBox(position,solid,1.1)){this.die(item.type==='tower'||item.type==='barrier'?'TERRAIN IMPACT':'STRUCTURE IMPACT');return;}
      }
    }
    for(const item of this.course.pickups){
      if(item.collected||Math.abs(item.p-run.progress)>20)continue;
      if(position.distanceTo(new THREE.Vector3(item.x,item.y,item.z))<4.5){
        item.collected=true;run.spread=true;this.audio.pickup();this.world.burst(position,0xd4a1ff,22);this.notify('THREE-WAY SHOT / WEAPONS UPGRADED',3,'#e2b4ff');
      }
    }
  }
  fire(position) {
    for(const direction of shotDirections(this.run.spread)){
      const origin=position.clone().add(new THREE.Vector3(0,0,-5));
      this.bullets.push({mesh:this.world.bullet(origin),velocity:new THREE.Vector3(direction.x*125,0,direction.z*125),life:1.9,enemy:false});
    }
    this.audio.shot();
  }
  updateEnemies(dt,position) {
    for(const enemy of this.course.targets){
      if(enemy.destroyed||enemy.escaped)continue;
      const distance=enemy.p-this.run.progress;
      if(enemy.type==='turret'&&distance<105&&distance>-18){
        enemy.cooldown-=dt;
        if(enemy.cooldown<=0){
          const origin=new THREE.Vector3(enemy.x,6,enemy.z);
          const velocity=position.clone().sub(origin).normalize().multiplyScalar(26);
          this.bullets.push({mesh:this.world.bullet(origin,true),velocity,life:5,enemy:true});enemy.cooldown=2.4;
        }
      }
      if(enemy.type==='interceptor'){
        if(!enemy.active&&distance<115&&distance>0){enemy.active=true;enemy.flightX=enemy.x>0?43:-43;enemy.flightZ=-enemy.p;}
        if(!enemy.active)continue;
        enemy.flightX+=(enemy.x>0?-1:1)*13*dt;enemy.flightZ+=9*dt;
        if(Math.abs(enemy.flightX)>52||enemy.flightZ>position.z+45){enemy.escaped=true;continue;}
        if(this.run.invulnerable<=0&&position.distanceTo(new THREE.Vector3(enemy.flightX,enemy.y,enemy.flightZ))<3.3){this.die('INTERCEPTOR COLLISION');return;}
      }
    }
  }
  updateBullets(dt,position) {
    for(let i=this.bullets.length-1;i>=0;i--){
      const b=this.bullets[i];b.life-=dt;b.mesh.position.addScaledVector(b.velocity,dt);
      let remove=b.life<=0;
      if(b.enemy){
        if(this.run.invulnerable<=0&&b.mesh.position.distanceTo(position)<1.65){this.die('HOSTILE FIRE');return;}
      }else{
        for(const target of this.course.targets){
          if(target.destroyed||target.escaped||Math.abs(target.p-this.run.progress)>260)continue;
          let hit=false;
          if(target.type==='interceptor'&&target.active)hit=b.mesh.position.distanceTo(new THREE.Vector3(target.flightX,target.y,target.flightZ))<3.4;
          else if(target.box)hit=intersectsBox(b.mesh.position,target.box,.4);
          if(!hit)continue;
          remove=true;
          if(target.type==='turret'||target.type==='interceptor'||target.type==='cargo'){
            target.hp--;this.world.burst(b.mesh.position,0xffcb8b,3);
            if(target.hp<=0){
              target.destroyed=true;this.run.destroyed++;this.run.score+=target.type==='interceptor'?250:target.type==='turret'?150:100;
              const origin=target.type==='interceptor'?new THREE.Vector3(target.flightX,target.y,target.flightZ):new THREE.Vector3(target.x,5,target.z);
              this.world.burst(origin);this.audio.hit();
            }
          }else this.world.burst(b.mesh.position,0xc4d9da,2);
          break;
        }
      }
      if(remove){this.world.removeEffect(b.mesh);this.bullets.splice(i,1);}
    }
  }
  clearBullets() {for(const b of this.bullets)this.world.removeEffect(b.mesh);this.bullets=[];}
  die(reason) {
    if(this.deathTimer||this.run.invulnerable>0)return;
    this.deathTimer=1;this.run.dying=true;this.world.burst(new THREE.Vector3(this.run.x,this.run.altitude,routeZ(this.run.progress,this.run.x)),0xff8855,40);
    this.audio.hit();this.clearBullets();this.notify(`${reason} / SIGNAL LOST`,2,'#ffb087');
  }
  finish(completed) {
    this.run.status=completed?'complete':'lost';if(completed)this.run.score+=1000;
    this.mode='results';this.audio.flight(false);if(completed)this.audio.pickup();
    $('result-eyebrow').textContent=completed?'MISSION 01 / COMPLETE':'TRANSMISSION ENDED';
    $('result-title').innerHTML=completed?'Made it<br><span>home.</span>':'Signal<br><span>lost.</span>';
    $('result-description').textContent=completed?'Runway crossed. The offshore run is yours.':'The offshore frontier takes another. Find a new line.';
    $('result-score').textContent=this.run.score.toLocaleString();$('result-time').textContent=formatTime(this.run.elapsed);$('result-targets').textContent=this.run.destroyed;
    this.setScreen();
  }
  updateHUD() {
    const r=this.run;const sector=Math.min(2,Math.floor(r.progress/2200));
    $('sector-number').textContent=`SECTOR 0${sector+1} / 03`;$('sector-name').textContent=SECTORS[sector];
    $('checkpoint-label').textContent=`CHECKPOINT / ${r.checkpoint===0?'DEPARTURE':r.checkpoint===2200?'01 SECURED':'02 SECURED'}`;
    $('score').textContent=r.score.toString().padStart(6,'0');$('lives').textContent='▲ '.repeat(Math.max(0,r.lives))+'△ '.repeat(3-Math.max(0,r.lives));
    $('lives').setAttribute('aria-label',`${r.lives} lives remaining`);$('timer').textContent=formatTime(r.elapsed);
    $('fuel-value').innerHTML=`${Math.ceil(r.fuel)}<span>%</span>`;$('fuel-fill').style.width=`${r.fuel}%`;
    document.querySelector('.fuel-panel').classList.toggle('warning',r.fuel<25);
    $('fuel-hint').textContent=r.refueling?'PAD LINK ACTIVE / HOLD LOW':r.fuel<25?'FUEL LOW / FIND A GREEN PAD':'LOW + GREEN PAD TO REFUEL';
    $('progress-value').textContent=`${Math.min(100,Math.floor(r.progress/RULES.length*100))}%`;$('progress-fill').style.width=`${clamp(r.progress/RULES.length*100,0,100)}%`;
    $('alt-marker').style.bottom=`${(r.altitude-RULES.minAltitude)/(RULES.maxAltitude-RULES.minAltitude)*100}%`;
    $('weapon-name').textContent=r.spread?'↖ ↑ ↗  THREE-WAY':'↑  SINGLE SHOT';document.querySelector('.weapon-panel').classList.toggle('upgraded',r.spread);
    $('flight-state').textContent=r.refueling?'HOVER / REFUEL':Math.abs(r.x)>28?'COURSE BOUNDARY':r.speed===RULES.slow?'SLOW / 08':'CRUISE / 20';
    show('refuel-indicator',r.refueling);$('refuel-value').textContent=`${Math.ceil(r.fuel)}%`;
  }
}
