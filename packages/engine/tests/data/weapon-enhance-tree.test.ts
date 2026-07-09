import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFirepower } from '../../src/data/blueprintCalc.js';
import type { AssembledWeapon } from '../../src/data/blueprintCalc.js';
import type { EffectEntry } from '../../src/data/effectList.js';

function makeW(p: Partial<AssembledWeapon>): AssembledWeapon {
  return { weaponId:'',systemId:'',systemLabel:'',slotId:'301010101',shipType:3,dph:100,attackRounds:1,attackCount:1,installNum:1,antiaircraftRatio:0,shotsPerCycle:1,fireDuration:1,cooldown:4,flightBefore:0,flightAfter:0,weaponType:3,tmt:201,actionType:2,specialTargetLogic:2,destroyCoef:0,aircraftCoef:100,airBaseBonus:0,airCdSkillRatio:0,airDurSkillRatio:0,isAirborne:false,damageType:'kinetic',canTargetShip:true,canTargetAircraft:false,canTargetDestroy:false,category:'antiShip',modDamageInc:0,modAircraftInc:0,modDestroyInc:0,...p };
}

const WNA = { '12020':{EFFECT_ATTR_NAME:'action_param',TABLE_NAME:'cfg_weapon_action',EFFECT_TYPE:'ratio_add'},'12041':{EFFECT_ATTR_NAME:'cd_time',TABLE_NAME:'cfg_weapon',EFFECT_TYPE:'ratio_del'},'12141':{EFFECT_ATTR_NAME:'duration',TABLE_NAME:'cfg_weapon_action',EFFECT_TYPE:'ratio_del'},'12142':{EFFECT_ATTR_NAME:'repeat_times',TABLE_NAME:'cfg_weapon_action',EFFECT_TYPE:'num_add'},'12294':{EFFECT_ATTR_NAME:'flight_time_before_cd',TABLE_NAME:'cfg_weapon',EFFECT_TYPE:'ratio_del'} } as any;

function makeStore(gn=1): any {
  return { ship:{'30101':['','','',3,100,100,0,0,0,'',0,3,3,0,0,0,0,0,0,0,gn,0,'',0]}, weaponNumAttr:WNA };
}

const BASE = 1080; // 100dph,穿抗max(90,10)=90, period=1+4=5, 1*1*90*60/5

test('行为不变性',()=>{
  const fp = computeFirepower([makeW({})], [], makeStore(1));
  assert.equal(fp.antiShip, BASE);
});

test('damage强化',()=>{
  const el=[{effectId:12020,value:50,sourceSlotId:'3010101',targetShip:0,targetSystem:0,targetIndex:0,targetModuleType:0,targetCompany:0,isSystemEffect:true}];
  const fp = computeFirepower([makeW({})], el, makeStore(1));
  assert.equal(fp.antiShip, 1680); // +50% → 150→穿抗140→1680
});

test('cooldown强化',()=>{
  const el=[{effectId:12041,value:50,sourceSlotId:'3010101',targetShip:0,targetSystem:0,targetIndex:0,targetModuleType:0,targetCompany:0,isSystemEffect:true}];
  const fp = computeFirepower([makeW({})], el, makeStore(1));
  assert.equal(fp.antiShip, 1800); // cd4*0.5=2, period=3, 90*60/3=1800
});

test('count强化',()=>{
  const el=[{effectId:12142,value:1,sourceSlotId:'3010101',targetShip:0,targetSystem:0,targetIndex:0,targetModuleType:0,targetCompany:0,isSystemEffect:true}];
  const fp = computeFirepower([makeW({})], el, makeStore(1));
  assert.equal(fp.antiShip, 2160); // repeat 1+1=2
});

test('flight强化',()=>{
  const w = makeW({flightBefore:2,flightAfter:3});
  const fp0 = computeFirepower([w], [], makeStore(1));
  assert.equal(fp0.antiShip, 540); // period=10
  const el=[{effectId:12294,value:50,sourceSlotId:'3010101',targetShip:0,targetSystem:0,targetIndex:0,targetModuleType:0,targetCompany:0,isSystemEffect:true}];
  const fp = computeFirepower([w], el, makeStore(1));
  assert.equal(fp.antiShip, 720); // flight 5*0.5=2.5, period=7.5
});

test('穿抗:实弹vs能量',()=>{
  assert.equal(computeFirepower([makeW({actionType:2})],[],makeStore(1)).antiShip, BASE);
  assert.equal(computeFirepower([makeW({actionType:1,damageType:'energy'})],[],makeStore(1)).antiShip, 1200);
});

test('action过滤:探测=0',()=>{
  assert.equal(computeFirepower([makeW({dph:8003,actionType:7,canTargetShip:true})],[],makeStore(1)).antiShip, 0);
});

test('防空命中率:战机0.60vs舰船0.15',()=>{
  const w1 = makeW({shipType:1,canTargetShip:false,canTargetAircraft:true,antiaircraftRatio:100,airBaseBonus:0});
  const w3 = makeW({shipType:3,canTargetShip:false,canTargetAircraft:true,antiaircraftRatio:100,airBaseBonus:0});
  const s1 = makeStore(1);
  const fp1 = computeFirepower([w1],[],s1);
  const fp3 = computeFirepower([w3],[],s1);
  assert.ok(fp1.antiAir>0 && fp3.antiAir>0);
  assert.equal(fp1.antiAir, fp3.antiAir*4);
});

test('编队架数',()=>{
  const fp1 = computeFirepower([makeW({})],[],makeStore(1));
  const fp5 = computeFirepower([makeW({})],[],makeStore(5));
  assert.equal(fp5.antiShip, fp1.antiShip*5);
});
