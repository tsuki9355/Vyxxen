import { routeZ, selectPickups } from './rules.js';

export const SECTORS = ['The Approach', 'Oil Fields', 'Last Light'];
// Fixed compositions: [distance, type, horizontal position, optional height].
// Checkpoint approaches remain clear; pads are placed before fuel becomes critical.
const LAYOUT = [
  [180,'turret',-17],[270,'barrier',10,5],[350,'cargo',-11],
  [460,'tower',-24,17],[485,'turret',18],[585,'barrier',-9,6],
  [680,'cargo',18],[840,'turret',-18],[930,'barrier',8,8],
  [1020,'tower',-23,21],[1080,'turret',14],[1170,'cargo',-8],
  [1280,'barrier',-18,5],[1350,'turret',20],[1480,'tower',19,19],
  [1600,'cargo',-19],[1690,'turret',-9],[1810,'barrier',12,8],
  [1900,'tower',-25,22],[2000,'turret',15],
  [2350,'turret',-20],[2420,'interceptor',-1,13],[2510,'barrier',15,9],
  [2600,'tower',-22,23],[2670,'cargo',7],[2780,'interceptor',1,8],
  [2950,'turret',21],[3020,'barrier',-13,7],[3100,'interceptor',-1,17],
  [3170,'tower',22,24],[3260,'turret',-15],[3350,'cargo',11],
  [3470,'barrier',18,9],[3550,'interceptor',1,12],[3630,'turret',-20],
  [3800,'tower',-23,24],[3860,'tower',23,24],[3920,'interceptor',-1,8],
  [4000,'cargo',0],[4070,'turret',18],[4170,'barrier',-15,8],
  [4550,'interceptor',1,14],[4600,'tower',-23,25],[4650,'turret',16],
  [4730,'barrier',-12,9],[4800,'interceptor',-1,10],[4910,'cargo',17],
  [5080,'turret',-18],[5130,'tower',22,25],[5200,'barrier',-15,8],
  [5260,'interceptor',1,19],[5310,'turret',15],[5400,'cargo',-10],
  [5460,'tower',-23,24],[5500,'tower',23,24],[5580,'interceptor',-1,9],
  [5710,'turret',18],[5830,'barrier',-17,9],[5890,'interceptor',1,16],
  [5960,'turret',-19],[6020,'tower',23,26],[6100,'cargo',-8],
  [6150,'interceptor',-1,12],[6220,'turret',17],[6300,'barrier',-16,7],
  [6360,'tower',24,24],[6410,'interceptor',1,17],
];
const PADS = [[0,0],[750,12],[1450,-12],[2200,0],[2870,-11],[3700,12],[4400,0],[5000,-12],[5650,11],[6350,0]];
const PICKUPS = [
  {section:0,p:410,x:7,y:12},{section:0,p:970,x:-7,y:11},{section:0,p:1540,x:4,y:14},
  {section:1,p:2480,x:-5,y:12},{section:1,p:3210,x:4,y:15},{section:1,p:4030,x:-8,y:13},
  {section:2,p:4700,x:5,y:15},{section:2,p:5360,x:-3,y:12},{section:2,p:6030,x:4,y:16},
];
export function createCourse(random = Math.random) {
  const targets = LAYOUT.map(([p,type,x,height],id) => ({ id:`target-${id}`,p,type,x,
    y:type === 'interceptor' ? height : 0, height:height || 0, z:routeZ(p,x),
    destroyed:false, hp:type === 'cargo' ? 3 : type === 'turret' ? 2 : 1,
    cooldown:1.2 + (id % 4) * .35, active:false, escaped:false,
  }));
  const pads = PADS.map(([p,x],id) => ({id:`pad-${id}`,type:'pad',p,x,z:routeZ(p,x),serviced:false}));
  const pickups = selectPickups(PICKUPS,random).map((p,id) => ({...p,id:`pickup-${id}`,type:'pickup',z:routeZ(p.p,p.x),collected:false}));
  return { targets,pads,pickups };
}
