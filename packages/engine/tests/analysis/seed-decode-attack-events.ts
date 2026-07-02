/**
 * 固定种子现象：逐舰伤害事件解码分析（NV1 = 2混沌 vs 1航母）
 *
 * 数据源：data/client/battle_report{,_nobuff}/enemy_battle_data_decoded.txt (服务器原始数据)
 *
 * 目标：把两份战报的"块2攻击事件"彻底拆解，提取每艘攻击舰对每个目标的
 *      逐发伤害分解，作为研究固定种子的新观察窗口。
 *
 * 关键认知（来自 BATTLE_REPORT_DECODED.md）：
 *   块2 = [玩家信息, [舰船记录], [攻击事件]]
 *   攻击事件 = [target_uid, weapon_id, [], [event_list]]
 *   event_list = [event_type, [[attacker_uid, val1, val2]...]]
 *     event_type=0: 命中/伤害相关  val1=weapon_action_id  val2=伤害
 *     event_type=2: 持续输出统计    val1=begin_time        val2=总伤害
 *     event_type=5: 击毁事件        val1=begin_time        val2=end_time(击毁时刻)
 *     event_type=8: 伤害统计        val1=begin_time        val2=总伤害
 *
 * 用法：npx tsx tests/analysis/seed-decode-attack-events.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const BASE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../data/client');

interface BattleBlocks {
  block0: any[]; // 舰队配置
  hpCurve: string; // HP曲线
  block2: any[]; // 舰船详细 + 攻击事件
}

/** 加载并解析一份战报 */
function loadBattle(file: string): { teamId: string; blocks: BattleBlocks } {
  const txt = fs.readFileSync(file, 'utf-8');
  let data: any;
  try {
    data = JSON.parse(txt);
  } catch {
    data = eval('(' + txt + ')');
  }
  const teamId = Object.keys(data)[0];
  const blocks = data[teamId] as any[];
  return {
    teamId,
    blocks: {
      block0: blocks[0],
      hpCurve: blocks[1] as string,
      block2: blocks[2] as any[],
    },
  };
}

/** 解析HP曲线为采样点数组 */
function parseHP(curve: string): { type: number; t: number; struct: number; atkStruct: number }[] {
  return curve
    .split('#')
    .filter((s) => s.trim())
    .map((s) => s.split(','))
    .filter((p) => p.length >= 4)
    .map((p) => ({ type: +p[0], t: +p[1], struct: +p[2], atkStruct: +p[3] }));
}

interface AttackTarget {
  targetUid: number;
  weaponId: number;
  events: { type: number; rows: [number, number, number][] }[];
}

/** 解析攻击事件块 */
function parseAttacks(block2: any[]): {
  player: any[];
  shipRecords: any[];
  attacks: AttackTarget[];
} {
  // block2[0] = 玩家信息, block2[1] = 舰船记录, block2[2] = 攻击事件列表
  // 但实际结构是 [[玩家信息], [舰船记录1, 舰船记录2], [攻击事件1, 攻击事件2]]
  // 注意：block2 本身可能被包了一层
  const inner = Array.isArray(block2[0]) && Array.isArray(block2[0][0]) ? block2[0] : block2;
  const player = inner[0];
  const shipRecords = inner[1] as any[];
  const attackList = inner[2] as any[];
  const attacks: AttackTarget[] = attackList.map((a: any[]) => ({
    targetUid: a[0] as number,
    weaponId: a[1] as number,
    events: (a[3] as any[]).map((ev: any[]) => ({
      type: ev[0] as number,
      rows: ev[1] as [number, number, number][],
    })),
  }));
  return { player, shipRecords, attacks };
}

/** 主分析 */
function analyze(label: string, file: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`【${label}】 ${file}`);
  console.log('='.repeat(70));

  const { blocks } = loadBattle(file);
  const hp = parseHP(blocks.hpCurve);
  const { player, shipRecords, attacks } = parseAttacks(blocks.block2);

  // ===== 舰船记录：每艘舰的结构/护盾 =====
  console.log('\n--- 防守方舰船记录（被攻击方） ---');
  console.log('  [bp_id, ship_uid, 结构, ship_id, ...]');
  for (const s of shipRecords) {
    // [bp_id, ship_uid, 结构, ship_id, ?,?,?, 20000, ?, 1, 16, ?,?,?, 结构, 护盾, ...]
    console.log(
      `  bp=${s[0]} uid=${s[1]} 结构=${s[2]} ship_id=${s[3]} | 索引14=${s[14]} 索引15=${s[15]}`
    );
  }

  // ===== 攻击事件分解 =====
  // attacks 数组里每个元素是 [target_uid, weapon_id, [], [events]]，已天然去重（按 target）
  console.log('\n--- 攻击事件逐目标分解（去重后） ---');
  // 收集所有出现的 attacker_uid
  const attackerUids = new Set<number>();
  for (const a of attacks) {
    for (const ev of a.events) {
      for (const [atkUid] of ev.rows) attackerUids.add(atkUid);
    }
  }
  console.log(`  攻击方舰船数（去重uid）: ${attackerUids.size} → [${[...attackerUids].join(', ')}]`);
  console.log(`  被攻击目标数: ${attacks.length} → [${attacks.map((a) => a.targetUid).join(', ')}]`);

  for (const a of attacks) {
    console.log(`\n  ▼ 目标 uid=${a.targetUid} (受击方) 武器id=${a.weaponId}`);
    for (const ev of a.events) {
      const typeLabel = ({ 0: '命中/伤害', 2: '持续输出', 5: '击毁', 8: '伤害统计' } as Record<number, string>)[ev.type] || `type${ev.type}`;
      for (const row of ev.rows) {
        console.log(`      [${typeLabel}] 攻击方uid=${row[0]} val1=${row[1]} val2=${row[2]}`);
      }
    }
  }

  return { hp, shipRecords, attacks };
}

// ===== 运行两份战报 =====
const buff = analyze(
  '有加成场 (+10%全 + 15%对大)',
  path.join(BASE, 'battle_report/enemy_battle_data_decoded.txt')
);
const nobuff = analyze(
  '无加成场',
  path.join(BASE, 'battle_report_nobuff/enemy_battle_data_decoded.txt')
);

// ===== 逐目标（逐舰）伤害分解对比 =====
// 结构：每个 attack = [target_uid, weapon_id, [], events]
//   events 里 type=0 的行 [attacker_uid, weapon_action_id, damage]
//     weapon_action_id 15123/15121 区分主炮/副炮（或不同攻击阶段）
//   type=2/8 的 val2 = 该攻击方对该目标的"持续输出/总伤害"汇总
console.log('\n\n' + '='.repeat(70));
console.log('★ 两场逐舰伤害分解对比（event type=0 主炮/副炮 + type=2 汇总）');
console.log('='.repeat(70));

interface TargetBreakdown {
  targetUid: number;
  // 按 weapon_action_id 分组的 type=0 伤害
  byAction: Map<number, number>;
  // type=2 持续输出（按攻击方）
  sustained: Map<number, number>;
  killed: boolean;
  initialStruct: number;
}

function breakdown(report: typeof buff): TargetBreakdown[] {
  return report.attacks.map((a) => {
    const byAction = new Map<number, number>();
    const sustained = new Map<number, number>();
    let killed = false;
    for (const ev of a.events) {
      for (const [atkUid, val1, val2] of ev.rows) {
        if (ev.type === 0) {
          byAction.set(val1, (byAction.get(val1) ?? 0) + val2);
        } else if (ev.type === 2) {
          sustained.set(atkUid, (sustained.get(atkUid) ?? 0) + val2);
        } else if (ev.type === 5) {
          killed = true;
        }
      }
    }
    const initialStruct = report.shipRecords.find((s) => s[1] === a.targetUid)?.[2] ?? 0;
    return { targetUid: a.targetUid, byAction, sustained, killed, initialStruct };
  });
}

const buffBD = breakdown(buff);
const nobuffBD = breakdown(nobuff);

function printBD(label: string, bds: TargetBreakdown[]) {
  console.log(`\n  ${label}:`);
  for (const bd of bds) {
    console.log(`    目标 uid=${bd.targetUid} 初始结构=${bd.initialStruct} 被击毁=${bd.killed}`);
    const actions = [...bd.byAction.entries()].sort((a, b) => a[0] - b[0]);
    for (const [actId, dmg] of actions) {
      const weaponName = actId === 15123 ? '主炮(action15123)' : actId === 15121 ? '副炮(action15121)' : `action${actId}`;
      console.log(`      ${weaponName}: type0伤害=${dmg}`);
    }
    for (const [atkUid, dmg] of bd.sustained) {
      console.log(`      持续输出(攻击方${atkUid}): type2=${dmg}`);
    }
  }
}

printBD('有加成场', buffBD);
printBD('无加成场', nobuffBD);

// ===== 关键对比表 =====
console.log('\n\n' + '='.repeat(70));
console.log('★ 逐舰伤害对比表（同配置两场，确定性证据）');
console.log('='.repeat(70));
console.log(`\n  ${'目标uid'.padEnd(12)}${'项'.padEnd(20)}${'有加成'.padStart(12)}${'无加成'.padStart(12)}${'差'.padStart(12)}`);
console.log('  ' + '-'.repeat(66));

// 按目标uid配对
const buffMap = new Map(buffBD.map((b) => [b.targetUid, b]));
const nobuffMap = new Map(nobuffBD.map((b) => [b.targetUid, b]));
// 注意：两场target uid不同（不同战报），但都是2艘同型舰，按顺序配对
const buffSorted = [...buffBD].sort((a, b) => a.targetUid - b.targetUid);
const nobuffSorted = [...nobuffBD].sort((a, b) => a.targetUid - b.targetUid);

for (let i = 0; i < Math.max(buffSorted.length, nobuffSorted.length); i++) {
  const b = buffSorted[i];
  const n = nobuffSorted[i];
  if (b && n) {
    console.log(`  ${String(b.targetUid).padEnd(12)}${'初始结构'.padEnd(20)}${String(b.initialStruct).padStart(12)}${String(n.initialStruct).padStart(12)}${String(b.initialStruct - n.initialStruct).padStart(12)}`);
    // 主炮 15123
    const bMain = b.byAction.get(15123) ?? 0;
    const nMain = n.byAction.get(15123) ?? 0;
    console.log(`  ${(b.targetUid + '/主炮').padEnd(12)}${'action15123伤害'.padEnd(20)}${String(bMain).padStart(12)}${String(nMain).padStart(12)}${String(bMain - nMain).padStart(12)}`);
    // 副炮 15121
    const bSub = b.byAction.get(15121) ?? 0;
    const nSub = n.byAction.get(15121) ?? 0;
    console.log(`  ${(b.targetUid + '/副炮').padEnd(12)}${'action15121伤害'.padEnd(20)}${String(bSub).padStart(12)}${String(nSub).padStart(12)}${String(bSub - nSub).padStart(12)}`);
    const bSust = [...b.sustained.values()].reduce((a, c) => a + c, 0);
    const nSust = [...n.sustained.values()].reduce((a, c) => a + c, 0);
    console.log(`  ${(b.targetUid + '/汇总').padEnd(12)}${'type2持续输出'.padEnd(20)}${String(bSust).padStart(12)}${String(nSust).padStart(12)}${String(bSust - nSust).padStart(12)}`);
  }
}

// ===== 总伤害对账 =====
console.log('\n\n' + '='.repeat(70));
console.log('★ 总伤害对账（航母反击混沌的总伤害）');
console.log('='.repeat(70));
function totalDamage(bds: TargetBreakdown[]) {
  let main = 0, sub = 0, sust = 0;
  for (const bd of bds) {
    main += bd.byAction.get(15123) ?? 0;
    sub += bd.byAction.get(15121) ?? 0;
    sust += [...bd.sustained.values()].reduce((a, c) => a + c, 0);
  }
  return { main, sub, sust };
}
const bt = totalDamage(buffBD);
const nt = totalDamage(nobuffBD);
console.log(`  有加成: 主炮15123=${bt.main} 副炮15121=${bt.sub} type2汇总=${bt.sust}`);
console.log(`  无加成: 主炮15123=${nt.main} 副炮15121=${nt.sub} type2汇总=${nt.sust}`);
console.log(`  注意：这是【航母反击混沌】的伤害，不是混沌打航母的（混沌打航母在HP曲线里）`);

// ===== HP曲线的首发掉血时刻 + 前30秒细粒度 =====
console.log('\n\n' + '='.repeat(70));
console.log('★ HP曲线前60秒细粒度对比（首发延迟 / 锁定 / 前摇）');
console.log('='.repeat(70));

function printFirst60(label: string, hp: any[]) {
  console.log(`\n  ${label}:`);
  console.log(`  ${'t'.padStart(6)}${'struct'.padStart(10)}${'Δstruct'.padStart(10)}${'atkStruct'.padStart(12)}${'Δatk'.padStart(10)}`);
  // 只取 type=5 的常规采样点
  const samples = hp.filter((p) => p.type === 5);
  let prev = samples[0];
  for (const p of samples) {
    if (p.t > 90) break;
    const dS = prev.struct - p.struct;
    const dA = prev.atkStruct - p.atkStruct;
    console.log(
      `  ${String(p.t).padStart(6)}${String(p.struct).padStart(10)}${String(dS).padStart(10)}${String(p.atkStruct).padStart(12)}${String(dA).padStart(10)}`
    );
    prev = p;
  }
}

printFirst60('有加成场', buff.hp);
printFirst60('无加成场', nobuff.hp);

// ===== 击毁时刻 =====
console.log('\n\n' + '='.repeat(70));
console.log('★ 击毁事件（type=97）');
console.log('='.repeat(70));
for (const p of [...buff.hp, ...nobuff.hp]) {
  if (p.type === 97) {
    console.log(`  ${p === buff.hp.find((x) => x.type === 97) ? '有加成' : '无加成'}: t=${p.t} struct=${p.struct} atkStruct=${p.atkStruct}`);
  }
}
