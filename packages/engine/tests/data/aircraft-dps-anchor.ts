/**
 * 舰载机/无人机 DPS 公式锚点校验
 *
 * 验证 computeAircraftDps 与客户端 AttrCalcBase.get_aircraft_dps 对齐。
 * 运行：cd packages/engine && npx tsx tests/data/aircraft-dps-anchor.ts
 *
 * 客户端公式（get_aircraft_dps.py）：
 *   for effect in all_effects_list where EFFECT_ID ∈ DRONE_EFFECT_IDS {2020,2021,2022,2023}:
 *       ship_id = EFFECT_PARAM / 100
 *       num     = EFFECT_PARAM % 100
 *       total_dps += BlueprintAttrCalc.prepare_by_ship_id(ship_id).get_ship_dps(dps_type) * num
 *
 * 锚点载机链（CV3000 / 80201，data/client/config 实证）：
 *   slot 802010204 module 48023 EID=2022 PARAM=1032005 → ship_id=10320 (IS-1型-无人机) num=5
 *   slot 802010812 module 48025 EID=2022 PARAM=1033503 → ship_id=10335 (IT-1型-无人机) num=3
 *   slot 802011319 module 48828 EID=2022 PARAM=1034203 → ship_id=10342 (LM-1型-战斗无人机) num=3
 *   载机 10320/10335/10342 的 AIRCRAFT_GROUP_NUM(field[20])=3。
 *
 * DRONE_EFFECT_IDS 来源：data/client/tools/effect_enum_values.json（字节码提取）
 *   2020 EFFECT_CARRIER / 2021 EFFECT_CARRIER_BOAT / 2022 EFFECT_DRONE / 2023 EFFECT_ACCOMPANY_DRONE
 *   ★2024 EFFECT_CARRIER_EFFECT_LIMIT 必须排除（机库限制标记，非载机来源）
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadClientDataFromDir } from './nodeUtils.js';
import {
  resolveShipWeapons, computeFirepower, computeAircraftDps, DRONE_EFFECT_IDS, loadWeaponPriority,
} from '../../src/data/blueprintCalc.js';
import { DPS_TYPE } from '../../src/data/effectList.js';
import { SHIP } from '../../src/data/rawTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${msg}`);
  }
}

console.log('=== 舰载机/无人机 DPS 公式锚点校验 ===\n');

const store = loadClientDataFromDir(CONFIG_DIR);
const wp = JSON.parse(readFileSync(join(CONFIG_DIR, 'weapon_priority.json'), 'utf-8'));
loadWeaponPriority(wp);

// ===== 1. DRONE_EFFECT_IDS 常量校验 =====
console.log('[1] DRONE_EFFECT_IDS 常量');
assert(DRONE_EFFECT_IDS.has(2020), 'DRONE_EFFECT_IDS 含 2020 (EFFECT_CARRIER 搭载战机)');
assert(DRONE_EFFECT_IDS.has(2021), 'DRONE_EFFECT_IDS 含 2021 (EFFECT_CARRIER_BOAT 搭载护航艇)');
assert(DRONE_EFFECT_IDS.has(2022), 'DRONE_EFFECT_IDS 含 2022 (EFFECT_DRONE 搭载无人机)');
assert(DRONE_EFFECT_IDS.has(2023), 'DRONE_EFFECT_IDS 含 2023 (EFFECT_ACCOMPANY_DRONE 伴飞无人艇)');
assert(!DRONE_EFFECT_IDS.has(2024), 'DRONE_EFFECT_IDS 排除 2024 (EFFECT_CARRIER_EFFECT_LIMIT 机库限制标记)');
assert(DRONE_EFFECT_IDS.size === 4, `DRONE_EFFECT_IDS 恰好 4 项 (实际 ${DRONE_EFFECT_IDS.size})`);

// ===== 2. EFFECT_PARAM 解码校验（ship_id = PARAM/100, num = PARAM%100）=====
console.log('\n[2] EFFECT_PARAM 解码（ship_id=PARAM/100, num=PARAM%100）');
// CV3000 module 48023 effect 4802301: EID=2022 PARAM=1032005
const me48023 = (store.moduleEffect as Record<string, any>)['4802301'];
assert(Number(me48023.EFFECT_ID) === 2022, 'module 48023 effect[01] EID=2022');
assert(Number(me48023.EFFECT_PARAM) === 1032005, 'module 48023 effect[01] PARAM=1032005');
assert(Math.floor(1032005 / 100) === 10320, 'PARAM 1032005 → ship_id 10320');
assert(1032005 % 100 === 5, 'PARAM 1032005 → num 5');
// 载机 10320 存在且 AIRCRAFT_GROUP_NUM=3
const ac10320 = store.ship['10320'] as unknown[];
assert(ac10320 != null, '载机 ship_id 10320 (IS-1型-无人机) 存在于 cfg_ship');
assert(Number(ac10320[SHIP.AIRCRAFT_GROUP_NUM]) === 3, `载机 10320 AIRCRAFT_GROUP_NUM=3 (实际 ${ac10320[SHIP.AIRCRAFT_GROUP_NUM]})`);

// ===== 3. 载机自身火力（递归基线）=====
console.log('\n[3] 载机自身火力（resolveShipWeapons → computeFirepower）');
// 载机 10320 (IS-1型-无人机) 应有可装配武器（slot 103200101 cat=1 武器 11043）
const acW10320 = resolveShipWeapons(store, '10320');
assert(acW10320.length > 0, `载机 10320 可装配武器 (实际 ${acW10320.length} 门)`);
const acFp10320 = computeFirepower(acW10320, [], store);
console.log(`  载机 10320 单架火力: 对舰=${acFp10320.antiShip} 防空=${acFp10320.antiAir} 攻城=${acFp10320.siege}`);
assert(acFp10320.antiShip > 0, `载机 10320 对舰火力>0 (实际 ${acFp10320.antiShip})`);

// ===== 4. CV3000 (80201) 舰载机总贡献（模块路径）=====
console.log('\n[4] CV3000 (80201) 舰载机 DPS（模块路径，computeAircraftDps）');
// CV3000 的可解析机库（2022 无人机）在可选系统 8020102/8020108/8020113 中：
//   slot 802010204 module 48023 → 10320×5 (系统 8020102，可选，默认未启用)
//   slot 802010812 module 48025 → 10335×3 (系统 8020108)
//   slot 802011319 module 48828 → 10342×3 (系统 8020113)
// 默认启用的 48021(2020)/48022(2021) 是 class 码（无法解析具体载机）。
// 故需显式启用可选机库系统才能解析出载机 DPS（对齐客户端：玩家选装机库）。
const cv3000HangarSlots = ['8020102', '8020108', '8020113'];
const cv3000AcAntiShip = computeAircraftDps(store, '80201', cv3000HangarSlots, DPS_TYPE.ANTI_SHIP);
console.log(`  CV3000 舰载机贡献(启可选机库): 对舰=${cv3000AcAntiShip}`);
assert(cv3000AcAntiShip > 0, `CV3000 舰载机对舰贡献>0 (实际 ${cv3000AcAntiShip})`);

// ===== 5. 玩家覆写路径（aircraftsOverride）=====
console.log('\n[5] 玩家覆写路径（aircraftsOverride 优先于模块推导）');
// 手动指定 1 架 10320
const override1 = { '10320': [1] };
const cv3000Override1 = computeAircraftDps(store, '80201', undefined, DPS_TYPE.ANTI_SHIP, override1);
// 应 = 载机10320单架对舰 × 1
assert(cv3000Override1 === acFp10320.antiShip * 1,
  `覆写 1×10320 = 单架对舰 (${acFp10320.antiShip}×1=${acFp10320.antiShip}, 实际 ${cv3000Override1})`);
// 手动指定 5 架 10320
const override5 = { '10320': [5] };
const cv3000Override5 = computeAircraftDps(store, '80201', undefined, DPS_TYPE.ANTI_SHIP, override5);
assert(cv3000Override5 === acFp10320.antiShip * 5,
  `覆写 5×10320 = 单架对舰×5 (${acFp10320.antiShip}×5=${acFp10320.antiShip * 5}, 实际 ${cv3000Override5})`);

// ===== 6. class 码跳过（2020/2021 无法解析）=====
console.log('\n[6] class 码跳过（2020/2021 PARAM//100 非 ship_id）');
// 太阳鲸 80101 module 48014: EID=2020 PARAM=308 → class 3, count 8（class 码不在 cfg_ship）
const taiyangAc = computeAircraftDps(store, '80101', undefined, DPS_TYPE.ANTI_SHIP);
// 太阳鲸只有 48016(2022→10305) 可解析，其余 2020/2021 class 码跳过
console.log(`  太阳鲸可解析舰载机贡献: 对舰=${taiyangAc}`);
assert(taiyangAc >= 0, `太阳鲸舰载机贡献非负 (实际 ${taiyangAc})`);

// ===== 7. 非母舰（无载机）返回 0 =====
console.log('\n[7] 非母舰（FG300 / 30101）无载机 → 0');
const fg300Ac = computeAircraftDps(store, '30101', undefined, DPS_TYPE.ANTI_SHIP);
assert(fg300Ac === 0, `FG300 舰载机贡献=0 (实际 ${fg300Ac})`);

// ===== 8. resolveBlueprintPanel 集成（面板火力含载机项）=====
console.log('\n[8] resolveBlueprintPanel 面板火力含载机项');
const { resolveBlueprintPanel } = await import('../../src/data/blueprintCalc.js');
const cv3000Panel = resolveBlueprintPanel(store, '80201', '', null, cv3000HangarSlots);
console.log(`  CV3000 面板火力(启机库): 对舰=${cv3000Panel.firepower.antiShip} 防空=${cv3000Panel.firepower.antiAir} 攻城=${cv3000Panel.firepower.siege}`);
// 纯武器火力（启同机库系统的武器部分）
const cv3000Weapons = resolveShipWeapons(store, '80201', cv3000HangarSlots);
const cv3000WeaponFp = computeFirepower(cv3000Weapons, [], store);
// 面板火力应 = 武器火力 + 载机贡献（>武器火力，因 10342×3 等高伤载机贡献）
assert(cv3000Panel.firepower.antiShip > cv3000WeaponFp.antiShip,
  `CV3000 面板对舰(${cv3000Panel.firepower.antiShip}) > 纯武器对舰(${cv3000WeaponFp.antiShip})，载机项已回填`);

// ===== 9. 非载机武器火力不受影响（回归保护）=====
console.log('\n[9] 回归保护：FG300 面板火力不变（无载机武器）');
const fg300Panel = resolveBlueprintPanel(store, '30101', '', null, undefined);
const fg300Weapons = resolveShipWeapons(store, '30101');
const fg300WeaponFp = computeFirepower(fg300Weapons, [], store);
assert(fg300Panel.firepower.antiShip === fg300WeaponFp.antiShip,
  `FG300 面板对舰(${fg300Panel.firepower.antiShip}) = 纯武器对舰(${fg300WeaponFp.antiShip})，无载机时不影响`);

console.log('\n=== 校验完成 ===');
if (process.exitCode) {
  console.error('有失败的校验！');
} else {
  console.log('✓ 全部通过');
}
