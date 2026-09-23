import * as THREE from 'three';
import { RULES, routeZ } from './rules.js';

const C = { sea:0x164658, foam:0x497a87, steel:0x3c5861, dark:0x172e3b,
  deck:0x75878a, white:0xe0e7d9, orange:0xf97b4c, green:0x8ce6bb, purple:0xd4a1ff };
const materials = new Map();
function material(color, options = {}) {
  const key = `${color}-${JSON.stringify(options)}`;
  if (!materials.has(key)) materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.8,flatShading:true,...options}));
  return materials.get(key);
}
function box(parent,w,h,d,x,y,z,color,options) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color,options));
  m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cylinder(parent,rt,rb,h,x,y,z,color,sides = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,sides),material(color));
  m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function beam(parent,from,to,width,color) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const m = box(parent,width,a.distanceTo(b),width,0,0,0,color);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize()); return m;
}
function label(parent,text,x,y,z,width = 11,color = '#e0e7d9') {
  const canvas = document.createElement('canvas'); canvas.width=512;canvas.height=128;
  const ctx = canvas.getContext('2d'); ctx.fillStyle=color;ctx.font='600 76px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,67);
  const texture = new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function deck(parent,w,d,height = 1.5,color = C.deck) {
  box(parent,w,1.3,d,0,height,0,color);
  box(parent,w+.4,.35,.7,0,height+.65,d/2,C.dark);
  box(parent,w+.4,.35,.7,0,height+.65,-d/2,C.dark);
  for (const x of [-w/2+1.8,w/2-1.8]) for (const z of [-d/2+2,d/2-2]) {
    cylinder(parent,.65,.85,5,x,-.6,z,C.dark,6);
  }
}
function shipModel(enemy = false) {
  const group = new THREE.Group(); const body = enemy ? C.orange : C.white;
  const shape = new THREE.Shape(); shape.moveTo(0,-5.5);shape.lineTo(1.45,.5);shape.lineTo(6,3.4);shape.lineTo(6,4.25);shape.lineTo(1.7,3.1);shape.lineTo(0,4);shape.lineTo(-1.7,3.1);shape.lineTo(-6,4.25);shape.lineTo(-6,3.4);shape.lineTo(-1.45,.5);shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape,{depth:.42,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.2,bevelThickness:.18});
  geo.rotateX(Math.PI/2);
  const wings = new THREE.Mesh(geo,material(body));wings.castShadow=true;group.add(wings);
  const fuselage = cylinder(group,.42,.9,7.3,0,.32,-.1,body,5);fuselage.rotation.x=Math.PI/2;
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(.85,6,4),material(C.dark,{metalness:.45,roughness:.25}));canopy.scale.set(.7,.62,1.8);canopy.position.set(0,.84,-.5);group.add(canopy);
  box(group,.45,.16,3.1,-3.7,.18,2.65,enemy?C.dark:C.orange);
  box(group,.45,.16,3.1,3.7,.18,2.65,enemy?C.dark:C.orange);
  const tail = box(group,.22,1.7,1.7,0,1.05,2.6,body);tail.rotation.x=-.3;
  const engine = cylinder(group,.53,.65,1.5,0,.3,3.1,C.dark,8);engine.rotation.x=Math.PI/2;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(.45,3.8,7),material(enemy?C.orange:0x8fe9fa,{emissive:enemy?C.orange:0x58c8f4,emissiveIntensity:1.4}));flame.rotation.x=Math.PI/2;flame.position.set(0,.3,5.25);group.add(flame);group.userData.flame=flame;
  if (enemy) group.scale.setScalar(.65);
  return group;
}

export class World {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();this.scene.background=new THREE.Color(C.sea);
    this.scene.fog=new THREE.Fog(C.sea,190,420);
    this.camera=new THREE.OrthographicCamera(-100,100,60,-60,.1,700);
    this.scene.add(new THREE.HemisphereLight(0xc4e7f2,0x273e4a,2.5));
    this.sun=new THREE.DirectionalLight(0xffe3ba,3.5);this.sun.castShadow=true;
    Object.assign(this.sun.shadow.camera,{left:-110,right:110,top:150,bottom:-150,near:1,far:300});
    this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.bias=-.0006;this.sun.shadow.normalBias=.3;this.scene.add(this.sun,this.sun.target);
    this.ocean=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800),material(C.sea,{roughness:.7,metalness:.15}));this.ocean.rotation.x=-Math.PI/2;this.ocean.position.y=-1.4;this.ocean.receiveShadow=true;this.scene.add(this.ocean);
    this.grid=new THREE.GridHelper(1500,150,0x366777,0x366777);this.grid.position.y=-1.35;this.grid.material.transparent=true;this.grid.material.opacity=.16;this.scene.add(this.grid);
    this.seaDetails=new THREE.Group();this.scene.add(this.seaDetails);
    for(let i=0;i<140;i++) {
      const foam=box(this.seaDetails,1+(i*7%11),.015,.12,(i*137.5%430)-215,-1.3,-(i*59.3%650),C.foam);
      foam.userData.offset=foam.position.z;
    }
    this.courseGroup=new THREE.Group();this.scene.add(this.courseGroup);this.objects=new Map();
    this.decor=new THREE.Group();this.scene.add(this.decor);this.buildScenery();
    this.ship=shipModel();this.scene.add(this.ship);
    this.shipShadow=new THREE.Mesh(new THREE.CircleGeometry(2.7,24),new THREE.MeshBasicMaterial({color:0x061c25,transparent:true,opacity:.3,depthWrite:false}));
    this.shipShadow.rotation.x=-Math.PI/2;this.shipShadow.scale.set(1,1.6,1);this.scene.add(this.shipShadow);
    this.altitudeLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,20,0)]),new THREE.LineDashedMaterial({color:0xafdccc,dashSize:.7,gapSize:.7,transparent:true,opacity:.32}));this.altitudeLine.computeLineDistances();this.scene.add(this.altitudeLine);
    this.effects=new THREE.Group();this.scene.add(this.effects);this.particles=[];
    this.bulletGeometry=new THREE.SphereGeometry(.4,6,4);
    this.particleGeometry=new THREE.BoxGeometry(1,1,1);
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  resize() {this.width=window.innerWidth;this.height=window.innerHeight;this.renderer.setSize(this.width,this.height);}
  buildScenery() {
    this.scenery=[];
    // Repeating edge beacons form the soft flight corridor, never collision terrain.
    for(let i=0;i<22;i++) for(const side of [-1,1]) {
      const g=new THREE.Group();cylinder(g,1.5,2.2,1.2,0,-.2,0,C.dark,6);cylinder(g,.3,.35,2.4,0,1.3,0,C.deck,6);
      cylinder(g,.45,.45,.5,0,2.7,0,C.green,6);g.userData={index:i,side,beacon:true};this.decor.add(g);this.scenery.push(g);
    }
    for(let i=0;i<8;i++) {
      const g=new THREE.Group();const side=i%2?1:-1;
      deck(g,21,30);box(g,15,7,18,0,5.5,0,C.steel);box(g,15.5,.6,18.5,0,9.3,0,C.deck);
      for(let j=0;j<3;j++) {const tank=cylinder(g,2.6,2.6,8,-4+j*4.5,13.5,2,C.white,10);tank.scale.z=.9;}
      box(g,20,.45,1.3,0,2.6,14,C.orange);
      beam(g,[-8,2,-9],[-8,26,-9],.65,C.orange);beam(g,[-8,26,-9],[12,26,-9],.65,C.orange);beam(g,[-8,17,-9],[8,26,-9],.4,C.orange);beam(g,[10,26,-9],[10,12,-9],.12,C.dark);
      label(g,`R / 0${i+1}`,0,9.65,-5,9);
      g.userData={index:i,side,beacon:false};this.decor.add(g);this.scenery.push(g);
    }
  }
  clearCourse() {
    this.courseGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose();}});
    this.courseGroup.clear();this.objects.clear();this.clearEffects();
  }
  buildCourse(course) {
    this.clearCourse();
    for (const item of [...course.targets,...course.pads,...course.pickups]) {
      const g = new THREE.Group();g.position.set(item.x,0,item.z);
      if(item.type==='pad') {
        deck(g,21,76,1.1,C.steel);
        box(g,17,.12,64,0,1.82,0,0x316c62);
        for(const x of [-9,9]) {box(g,.3,.14,70,x,1.91,0,C.green,{emissive:C.green,emissiveIntensity:.4});for(let z=-32;z<=32;z+=8)box(g,.8,.18,2,x,2,z,C.green);}
        for(const z of [-32,32])box(g,18,.15,.35,0,1.94,z,C.green);
        label(g,'FUEL',0,1.96,9,12,'#aeffd9');label(g,'↓  ↓  ↓',0,1.96,25,10,'#aeffd9');label(g,'OIL / '+item.id.slice(4).padStart(2,'0'),0,1.96,-23,11,'#91bfb4');
        box(g,5,.15,1,0,1.98,-4,C.green);box(g,1,.15,5,0,1.98,-4,C.green);
        for(const x of [-12,12]){cylinder(g,1.5,1.5,4,x,2,-20,C.white);box(g,3.2,.7,3.2,x,2.5,-20,C.orange);}
        item.box={x:item.x,z:item.z,w:19,d:72,bottom:0,top:RULES.lowAltitude};
      } else if(item.type==='tower') {
        deck(g,12,17);box(g,10,item.height-2,14,0,item.height/2+1,0,C.steel);box(g,10.7,.65,14.7,0,item.height+.2,0,C.white);
        box(g,10.2,1.6,14.2,0,item.height-3,0,C.orange);
        for(let y=5;y<item.height-4;y+=4)for(const x of [-5.1,5.1])box(g,.15,.7,9,x,y,0,C.dark);
        box(g,2,3,4,1,item.height+2,-2,C.deck);beam(g,[-3,item.height,-5],[-3,item.height+6,-5],.13,C.dark);
        item.box={x:item.x,z:item.z,w:12,d:17,bottom:0,top:item.height+1};
      } else if(item.type==='barrier') {
        deck(g,28,9);box(g,27,item.height-2,7,0,item.height/2+1,0,C.deck);
        box(g,28,.6,8,0,item.height+.2,0,C.orange);
        for(let x=-12;x<=12;x+=4) {const stripe=box(g,1.2,item.height-2,.12,x,item.height/2+1,3.56,C.dark);stripe.rotation.z=-.3;}
        item.box={x:item.x,z:item.z,w:28,d:9,bottom:0,top:item.height+.6};
      } else if(item.type==='turret') {
        deck(g,12,14);cylinder(g,4,4.5,2,0,3,0,C.dark,8);
        const head=new THREE.Group();head.position.y=5;g.add(head);box(head,5,2.5,5,0,0,0,C.orange);box(head,1,1,6,0,.2,4,C.dark);
        box(head,2,.3,1.5,0,1.35,-.6,C.white);g.userData.head=head;
        // Visible energy mast makes ground targets hittable in all three flight bands.
        cylinder(g,.2,.2,18,0,13,0,C.orange,6);cylinder(g,.7,.7,.7,0,22,0,C.orange,6);
        item.box={x:item.x,z:item.z,w:9,d:11,bottom:1,top:23};
      } else if(item.type==='cargo') {
        deck(g,12,14);box(g,8,7,10,0,5.5,0,C.orange);box(g,8.4,.4,10.4,0,9.2,0,C.white);
        for(let x=-3;x<=3;x+=2)box(g,.2,6,10.1,x,5.5,0,C.dark);
        label(g,'×',0,9.5,0,6);
        item.box={x:item.x,z:item.z,w:10,d:12,bottom:0,top:9.5};
      } else if(item.type==='interceptor') {
        g.add(shipModel(true));g.position.y=item.y;g.rotation.y=item.x>0?Math.PI/2:-Math.PI/2;
      } else if(item.type==='pickup') {
        const outer=new THREE.Mesh(new THREE.OctahedronGeometry(2.5),material(C.purple,{emissive:0x994ddd,emissiveIntensity:.6,wireframe:true}));g.add(outer);
        const core=new THREE.Mesh(new THREE.OctahedronGeometry(1.2),material(C.purple,{emissive:C.purple,emissiveIntensity:.65}));g.add(core);
        g.position.y=item.y;
      }
      this.courseGroup.add(g);this.objects.set(item.id,g);
    }
    const runway=new THREE.Group();runway.position.z=-RULES.length;
    deck(runway,65,160,1.5,C.steel);
    for(const x of [-29,29]) {box(runway,.4,.1,154,x,2.21,0,C.green,{emissive:C.green,emissiveIntensity:.5});for(let z=-70;z<80;z+=8)box(runway,1,.2,1,x,2.5,z,C.green);}
    for(let z=-70;z<=70;z+=14)box(runway,.8,.1,7,0,2.3,z,C.white);
    for(let x=-22;x<=22;x+=4)box(runway,1.8,.1,13,x,2.3,30,C.white);
    label(runway,'09',-13,2.32,5,13);label(runway,'VYXXEN / HOME',0,2.32,-48,37);
    this.courseGroup.add(runway);this.runway=runway;
  }
  bullet(position,enemy=false) {
    const m=new THREE.Mesh(this.bulletGeometry,material(enemy?C.orange:0xb1f9ff,{emissive:enemy?0xff4f16:0x81e3ff,emissiveIntensity:2}));
    m.position.copy(position);m.scale.set(enemy?1.6:.55,enemy?1.6:.55,enemy?1.6:4.5);this.effects.add(m);return m;
  }
  removeEffect(mesh) {this.effects.remove(mesh);}
  burst(position,color=C.orange,count=18) {
    for(let i=0;i<count;i++) {
      const m=new THREE.Mesh(this.particleGeometry,material(color,{emissive:color,emissiveIntensity:.35}));m.position.copy(position);m.scale.setScalar(.4+Math.random()*.9);this.effects.add(m);
      this.particles.push({mesh:m,velocity:new THREE.Vector3((Math.random()-.5)*19,Math.random()*15,(Math.random()-.5)*19),life:.4+Math.random()*.55,max:1});
    }
  }
  clearEffects() {this.effects.clear();this.particles=[];}
  render(run,course,time,dt,title=false) {
    const progress=title?600:run.progress;
    const shipX=title?5:run.x;const shipY=title?16+Math.sin(time)*.5:run.altitude;const shipZ=routeZ(progress,shipX);
    this.ship.position.set(shipX,shipY,shipZ);
    this.ship.rotation.z=THREE.MathUtils.lerp(this.ship.rotation.z,title?-.1:-(run.moveX||0)*.2,.12);
    this.ship.rotation.x=title?.03:-(run.moveY||0)*.07;
    this.ship.visible=title||(!run.dying&&(run.invulnerable<=0||Math.floor(time*12)%2===0));
    this.ship.userData.flame.scale.y=.8+Math.sin(time*45)*.15;
    this.shipShadow.position.set(shipX,1.99,shipZ);this.shipShadow.material.opacity=.28-shipY*.004;
    this.altitudeLine.position.set(shipX,2.1,shipZ);this.altitudeLine.scale.y=(shipY-2.1)/20;this.altitudeLine.visible=!title;
    const aspect=this.width/this.height;const view=title?106:116;
    this.camera.left=-view*aspect/2;this.camera.right=view*aspect/2;this.camera.top=view/2;this.camera.bottom=-view/2;this.camera.updateProjectionMatrix();
    const target=new THREE.Vector3(title?-29:0,0,-progress-(title?12:35));
    this.camera.position.copy(target).add(new THREE.Vector3(88,115,132));this.camera.lookAt(target);
    this.sun.position.set(-65,130,-progress+45);this.sun.target.position.set(0,0,-progress-35);
    this.ocean.position.z=-progress;this.grid.position.z=-Math.floor(progress/10)*10;
    this.seaDetails.position.z=-Math.floor(progress/650)*650+170;
    for(const foam of this.seaDetails.children)foam.position.x+=Math.sin(time*.5+foam.userData.offset)*dt*.18;
    for(const g of this.scenery) {
      const spacing=g.userData.beacon?22:100;const count=g.userData.beacon?22:8;
      const p=(Math.floor((progress-140)/spacing/count)*count+g.userData.index)*spacing;
      const adjusted=p<progress-140?p+count*spacing:p;
      const x=g.userData.side*(g.userData.beacon?35:64+(g.userData.index%3)*8);
      g.position.set(x,0,routeZ(adjusted,x));
      g.visible=adjusted<progress+350;
    }
    for(const item of course.targets) {
      const g=this.objects.get(item.id);g.visible=!item.destroyed&&!item.escaped&&item.p>progress-100&&item.p<progress+310;
      if(item.type==='interceptor') {
        if(!item.active)g.visible=false;
        else g.position.set(item.flightX,item.y,item.flightZ);
      }
      if(g.visible&&item.type==='turret')g.userData.head.rotation.y=Math.atan2(shipX-item.x,shipZ-item.z);
    }
    for(const item of course.pads) {const g=this.objects.get(item.id);g.visible=Math.abs(item.p-progress)<350;}
    let pickupVisible=false;
    for(const item of course.pickups) {
      const g=this.objects.get(item.id);g.visible=!pickupVisible&&!item.collected&&item.p>progress-20&&item.p<progress+130;
      if(g.visible){pickupVisible=true;g.rotation.y=time*1.5;g.rotation.z=Math.sin(time)*.15;g.position.y=item.y+Math.sin(time*2)*.6;}
    }
    this.runway.visible=progress>RULES.length-350;
    for(let i=this.particles.length-1;i>=0;i--) {
      const p=this.particles[i];p.life-=dt;
      if(p.life<=0){this.effects.remove(p.mesh);this.particles.splice(i,1);continue;}
      p.mesh.position.addScaledVector(p.velocity,dt);p.velocity.y-=15*dt;p.mesh.rotation.x+=dt*3;p.mesh.scale.multiplyScalar(Math.exp(-dt*1.6));
    }
    this.renderer.render(this.scene,this.camera);
  }
}
