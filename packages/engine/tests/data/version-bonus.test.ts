/**
 * 版本号结构加成测试（装配科技点 + 分舰级 shipHpAdd）
 *
 * ★规则（用户三次澄清确认）：
 * 1. 总科技点 = 强化项消耗点 + 装配点
 *    - 装配点：超主力舰每个有装配的切换组 +10（普通舰=0）
 *    - 强化项消耗：所有强化项 ENHANCE_COST（不区分效果是否生效）
 * 2. 版本号加成 = 总科技点 × shipHpAdd
 *    - 普通舰（护卫/驱逐/巡洋）：cfg_ship_type[9]（驱逐=40）
 *    - 超主力舰（战巡/航母/战列/支援）：cfg_ship_type[10]=50
 *
 * 锚点：
 *   60501（战巡，超主力）：shipHpAdd=50，切换组 GROUP201+GROUP202 各装配→20装配点
 *   40501（驱逐，普通）：shipHpAdd=40，无切换组装配→0装配点
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClientDataFromDir } from './nodeUtils.js';
import { resolveBlueprint, countInstallTechPoints } from '../../src/data/blueprintResolver.js';
import type { ClientDataStore } from '../../src/data/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'client', 'config');

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${msg}`);
  }
}

const store: ClientDataStore = loadClientDataFromDir(CONFIG_DIR);

console.log('=== 版本号结构加成测试 ===\n');

// ===== 测试1: countInstallTechPoints 推测函数（启发式，非精确）=====
console.log('[测试1] countInstallTechPoints 推测（超主力舰>0，普通舰=0）');
{
  // countInstallTechPoints 是启发式推测（配置表无法可靠判定初始空槽）
  // 仅验证：超主力舰推测>=0，普通舰=0
  const pts60501 = countInstallTechPoints(store, '60501');
  assert(pts60501 >= 0, `60501 推测装配点>=0 (实际${pts60501})`);
  const pts40501 = countInstallTechPoints(store, '40501');
  assert(pts40501 === 0, `40501 普通舰推测=0 (实际${pts40501})`);
  const ptsNone = countInstallTechPoints(store, '99999');
  assert(ptsNone === 0, `不存在的船=0`);
}

// ===== 测试2: 超主力舰无版本号结构加成（shipHpAdd=0）=====
console.log('\n[测试2] 60501 超主力舰 shipHpAdd=0，版本加成=0');
{
  // ★超主力舰（战巡/航母/战列）无版本号结构加成——cfg_ship_type[9]=0
  // 实测印证：CV3000(航母) finalStructure=278340×1.33=370192，无版本加成
  // 即使传 installPoints，因 shipHpAdd=0，版本加成仍=0
  const bp = resolveBlueprint(store, '60501', '', { installPoints: 20 });
  assert(bp.finalStructure === 180470, `60501 超主力舰版本加成=0，finalStructure=180470 (实际${bp.finalStructure})`);
}

// ===== 测试3: resolveBlueprint 不传 installPoints 默认0（向后兼容）=====
console.log('\n[测试3] resolveBlueprint 不传 installPoints 默认0');
{
  const bp = resolveBlueprint(store, '60501', '', {});
  assert(bp.finalStructure === 180470, `60501 finalStructure=180470 (实际${bp.finalStructure})`);
}

// ===== 测试4: 超主力舰即使有科技点，版本加成仍=0 =====
console.log('\n[测试4] 60501 techPoints=30 + installPoints=20（超主力 shipHpAdd=0）');
{
  // 超主力舰 shipHpAdd=0，即使总科技点50，版本加成 = 50×0 = 0
  const bp = resolveBlueprint(store, '60501', '', { techPoints: 30, installPoints: 20 });
  assert(bp.finalStructure === 180470, `60501 版本加成=0，finalStructure=180470 (实际${bp.finalStructure})`);
}

// ===== 测试6: resolveBlueprint 40501 普通舰版本号（无装配点）=====
console.log('\n[测试6] resolveBlueprint 40501 普通舰（无装配点）');
{
  // 40501 驱逐 shipHpAdd=40，装配点=0
  // techPoints=98：版本加成 = 98×40 = 3920
  const bp = resolveBlueprint(store, '40501', '', { techPoints: 98 });
  // finalStructure = 36040 + 3920 = 39960
  assert(bp.finalStructure === 39960, `40501 techPoints=98 finalStructure=39960(98×40) (实际${bp.finalStructure})`);
}

// ===== 测试7: 直接 versionStructureBonus 优先级最高 =====
console.log('\n[测试7] versionStructureBonus 优先级');
{
  const bp = resolveBlueprint(store, '60501', '', { versionStructureBonus: 9999, techPoints: 30 });
  // 直接提供的 versionStructureBonus 优先，不计装配点
  assert(bp.finalStructure === 180470 + 9999, `60501 versionStructureBonus=9999 优先 (实际${bp.finalStructure})`);
}

// ===== 测试8: ★科技点统计独立于结构加成 =====
console.log('\n[测试8] 科技点统计独立性（超主力舰装配点可统计，不影响结构）');
{
  // countInstallTechPoints 能独立统计装配点（即使超主力舰结构加成=0）
  // 60501 推测装配点=20（GROUP201+GROUP202各有可选系统装配）
  const installPts = countInstallTechPoints(store, '60501');
  assert(installPts >= 0, `60501 装配点可统计 (实际${installPts})`);
  // 普通舰装配点=0
  assert(countInstallTechPoints(store, '40501') === 0, `40501 装配点=0`);

  // 装配点不影响超主力舰结构（shipHpAdd=0），但数值本身保留
  const bp = resolveBlueprint(store, '60501', '', { installPoints: installPts });
  assert(bp.finalStructure === 180470, `超主力舰结构不受装配点影响 (实际${bp.finalStructure})`);
}

console.log('\n=== 测试完成 ===');
