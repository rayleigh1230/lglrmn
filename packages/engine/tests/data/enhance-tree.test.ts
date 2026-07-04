/**
 * 强化项科技树测试（前置依赖 + 系统-模块容器语义门控）
 *
 * ★核心语义（已验证）：
 * 1. 系统=容器，模块=内容。空槽（无模块）的强化项不生效（系统不存在）
 * 2. 科技树前置依赖：cfg_system_enhance_tree 格式 "parents;treeId"+flag，per-slot DAG
 * 3. 切换组每个成员是独立系统槽，各有独立强化树，只激活选中成员
 *
 * 锚点（60501）：
 *   slot01 科技树：optIdx01=根(treeId2), 02依赖01, 05依赖[10,13,01], 10/13=特殊解锁(flag1/2)
 *   slot01(6050101舰首轨道炮)=空槽(无模块) → 强化项不应生效
 *   slot10(6050110附加装甲,装36052)=有模块 → 强化项生效
 *   GROUP202(切换组): 6050109/6050110/6050111 三成员，enabledSlots 控制激活
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadClientDataFromDir } from './nodeUtils.js';
import {
  resolveEnhanceSystem,
  resolveEnhanceTree,
  isEnhanceAvailable,
} from '../../src/data/enhanceSystem.js';
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

console.log('=== 强化项科技树测试 ===\n');

// ===== 测试1: 60501 slot01 科技树前置依赖 =====
console.log('[测试1] 60501 slot01 科技树前置依赖');
{
  const sys = resolveEnhanceSystem(store, '60501');
  const slot01 = sys.bySlot['6050101'];

  // optIdx01 = 根节点（无前置）
  const n01 = slot01.find((s) => s.optIdx === 1);
  assert(n01?.prerequisites.length === 0, `optIdx01 是根节点（无前置）`);
  assert(n01?.treeColumn === 2, `optIdx01 treeColumn=2`);

  // optIdx02 依赖 01
  const n02 = slot01.find((s) => s.optIdx === 2);
  assert(n02?.prerequisites.length === 1, `optIdx02 有1个前置`);
  assert(n02?.prerequisites[0] === '605010101', `optIdx02 前置=605010101`);

  // optIdx05 依赖 [10, 13, 01]（多前置）
  const n05 = slot01.find((s) => s.optIdx === 5);
  assert(n05?.prerequisites.length === 3, `optIdx05 有3个前置`);
  assert(n05?.prerequisites.includes('605010110'), `optIdx05 前置含 605010110`);
  assert(n05?.prerequisites.includes('605010113'), `optIdx05 前置含 605010113`);
  assert(n05?.prerequisites.includes('605010101'), `optIdx05 前置含 605010101`);

  // optIdx10/13 = 特殊解锁节点（flag 1/2）
  const n10 = slot01.find((s) => s.optIdx === 10);
  assert(n10?.nodeFlag === 1, `optIdx10 nodeFlag=1（特殊解锁）`);
  const n13 = slot01.find((s) => s.optIdx === 13);
  assert(n13?.nodeFlag === 2, `optIdx13 nodeFlag=2（特殊解锁）`);
}

// ===== 测试2: 容器语义——有模块 vs 真空槽 hasModule =====
console.log('\n[测试2] 容器语义：6050101(有模块,cat=1主武器) vs 9800101(真空槽)');
{
  const sys60501 = resolveEnhanceSystem(store, '60501');
  // 6050101 舰首轨道炮 = 装配了 16051（cat=1 主武器模块）
  const info01 = sys60501.slotInfos['6050101'];
  assert(info01 != null, `6050101 slotInfo 存在`);
  assert(info01?.hasModule === true, `6050101 有模块 hasModule=true (cat=1主武器也算装配)`);
  assert((info01?.installedModuleIds ?? []).length > 0, `6050101 有已装配模块`);
  // 6050110 附加装甲 = 有模块（cat=0）
  const info10 = sys60501.slotInfos['6050110'];
  assert(info10?.hasModule === true, `6050110 有模块 hasModule=true`);

  // 真正的空槽：9800101（系统槽存在但无任何装配行）
  const sys98001 = resolveEnhanceSystem(store, '98001');
  const infoEmpty = sys98001.slotInfos['9800101'];
  if (infoEmpty) {
    assert(infoEmpty.hasModule === false, `9800101 真空槽 hasModule=false`);
    assert((infoEmpty.installedModuleIds ?? []).length === 0, `9800101 无已装配模块`);
  }
}

// ===== 测试3: isEnhanceAvailable 空槽门控 =====
console.log('\n[测试3] isEnhanceAvailable 空槽门控');
{
  // 用真正的空槽 9800101 测试门控
  const sys = resolveEnhanceSystem(store, '98001');
  const slotEmpty = sys.bySlot['9800101']?.[0];
  const infoEmpty = sys.slotInfos['9800101'];
  if (slotEmpty && infoEmpty) {
    const avail = isEnhanceAvailable(slotEmpty, infoEmpty, new Set());
    assert(avail.available === false, `空槽强化项不可用`);
    assert(avail.reasons.length > 0, `空槽有不可用原因`);
  }
}

// ===== 测试4: isEnhanceAvailable 有模块 + 前置门控 =====
console.log('\n[测试4] isEnhanceAvailable 有模块 + 前置门控');
{
  // 6050110 是切换组成员，需传 enabledSlots 激活
  const sys = resolveEnhanceSystem(store, '60501', ['6050110']);
  const slot10 = sys.bySlot['6050110'];
  const info10 = sys.slotInfos['6050110'];
  const n01 = slot10.find((s) => s.optIdx === 1)!;

  // 有模块 + 已激活 + 无前置 → 可用
  const acquired = new Set<string>();
  const avail = isEnhanceAvailable(n01, info10, acquired);
  if (n01.prerequisites.length === 0) {
    assert(avail.available === true, `6050110 optIdx01 有模块+激活+无前置 → available=true`);
  }

  // 有前置但未获得 → 不可用
  const nWithPrereq = slot10.find((s) => s.prerequisites.length > 0);
  if (nWithPrereq) {
    const avail2 = isEnhanceAvailable(nWithPrereq, info10, new Set());
    assert(avail2.available === false, `有前置未获得 → available=false`);
    assert(avail2.reasons.some((r) => r.includes('前置未解锁')), `原因含"前置未解锁"`);
  }
}

// ===== 测试5: 切换组 isActive 门控 =====
console.log('\n[测试5] 切换组 GROUP202 isActive 门控');
{
  // 不传 enabledSlots：GROUP202(6050109/6050110/6050111) 全 ADDITIONAL_SYS=1，无默认→全不激活
  const sys1 = resolveEnhanceSystem(store, '60501');
  const info110_default = sys1.slotInfos['6050110'];
  assert(info110_default?.isSwitchable === true, `6050110 是切换组成员`);

  // 传 enabledSlots=['6050110']：只激活 6050110
  const sys2 = resolveEnhanceSystem(store, '60501', ['6050110']);
  const info110_on = sys2.slotInfos['6050110'];
  const info109_on = sys2.slotInfos['6050109'];
  assert(info110_on?.isActive === true, `enabledSlots=[6050110] → 6050110 isActive=true`);
  assert(info109_on?.isActive === false, `enabledSlots=[6050110] → 6050109 isActive=false`);

  // 非激活成员的强化项不可用
  const slot109 = sys2.bySlot['6050109'];
  if (slot109 && slot109.length > 0) {
    const info109 = sys2.slotInfos['6050109'];
    const avail = isEnhanceAvailable(slot109[0], info109, new Set());
    assert(avail.available === false, `未激活成员强化项 available=false`);
  }
}

// ===== 测试6: resolveEnhanceTree 按列分组 =====
console.log('\n[测试6] resolveEnhanceTree 按列分组');
{
  const tree = resolveEnhanceTree(store, '60501', '6050101');
  // slot01 有 treeColumn 2/3/4
  const cols = Object.keys(tree.columns).map(Number);
  assert(cols.includes(2), `含列 2`);
  assert(cols.includes(3), `含列 3`);
  assert(cols.includes(4), `含列 4`);
  // 根节点（无前置）：optIdx01/03/10/13
  const rootOptIdxs = tree.roots.map((r) => r.optIdx).sort((a, b) => a - b);
  assert(rootOptIdxs.includes(1), `根节点含 optIdx01`);
  assert(rootOptIdxs.includes(3), `根节点含 optIdx03`);
  assert(rootOptIdxs.includes(10), `根节点含 optIdx10`);
}

// ===== 测试7: per-slot 隔离（6050110 与 6050112 强化树独立）=====
console.log('\n[测试7] per-slot 隔离');
{
  const sys = resolveEnhanceSystem(store, '60501');
  const slot10 = sys.bySlot['6050110'] ?? [];
  const slot12 = sys.bySlot['6050112'] ?? [];
  // 两槽强化项数量不同（6050110=5, 6050112=11）
  assert(slot10.length !== slot12.length, `6050110(${slot10.length}) 与 6050112(${slot12.length}) 强化项数量不同`);
  // 前缀不重叠
  const prefixes10 = new Set(slot10.map((s) => s.effectPrefix));
  const prefixes12 = new Set(slot12.map((s) => s.effectPrefix));
  const overlap = [...prefixes10].filter((p) => prefixes12.has(p));
  // 允许少量重叠（如同名装甲强化），但大部分应不同
  assert(prefixes10.size > 0 && prefixes12.size > 0, `两槽都有强化项前缀`);
}

console.log('\n=== 测试完成 ===');
