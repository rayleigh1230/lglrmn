/**
 * 43秒无策略靶战斗 —— 10艘斗牛个体伤害分析
 *
 * 这是【同一场战斗】里10艘斗牛各自的伤害
 * 目标: 51632血, +30%命中, 无策略靶(闪避0), 42-43s
 */
const ships = [
  { id: 1, main: 5140, sub: 891 },
  { id: 2, main: 5135, sub: 918 },
  { id: 3, main: 2570, sub: 756 },
  { id: 4, main: 3598, sub: 729 },
  { id: 5, main: 4626, sub: 675 },
  { id: 6, main: 5140, sub: 837 },
  { id: 7, main: 3598, sub: 810 },
  { id: 8, main: 5140, sub: 837 },
  { id: 9, main: 4626, sub: 783 },
  { id: 10, main: 4112, sub: 702 },
];

const PER_HIT_MAIN = 514;
const PER_HIT_SUB = 27;
const DPH_MAIN = 525;
const DPH_SUB = 28;
const SHIELD = 0.03;

console.log('='.repeat(85));
console.log('同一场43s战斗: 10艘斗牛个体伤害分析');
console.log('='.repeat(85));
console.log('perHit: 主武器514(525×0.979), 副武器27(28×0.964)');
console.log('');

// 每艘命中发数
console.log('艘 | 主伤害 | 主命中 | 副伤害 | 副命中 | 总伤害 | 主命中率* | 副命中率*');
console.log('-'.repeat(85));
let totalMainDmg = 0, totalSubDmg = 0;
let totalMainHits = 0, totalSubHits = 0;
for (const s of ships) {
  const mH = s.main / PER_HIT_MAIN;
  const sH = s.sub / PER_HIT_SUB;
  totalMainDmg += s.main;
  totalSubDmg += s.sub;
  totalMainHits += mH;
  totalSubHits += sH;
  // *命中率暂用假设发数(待定): 主6发/艘, 副?
  console.log(` ${s.id.toString().padStart(2)} | ${s.main} | ${mH.toFixed(1).padStart(5)} | ${s.sub} | ${sH.toFixed(1).padStart(5)} | ${(s.main+s.sub).toString().padStart(5)} |`);
}

console.log('-'.repeat(85));
console.log(`合计| ${totalMainDmg} | ${totalMainHits.toFixed(0)} | ${totalSubDmg} | ${totalSubHits.toFixed(0)} | ${totalMainDmg+totalSubDmg}`);
console.log(`目标血量: 51632`);
console.log(`总伤害 ${totalMainDmg+totalSubDmg} vs 血量51632 → ${Math.abs(totalMainDmg+totalSubDmg-51632) < 100 ? '✓吻合(过杀少量)' : '差'+(totalMainDmg+totalSubDmg-51632)}`);

console.log('\n' + '='.repeat(85));
console.log('一、总伤害对账(验证perHit正确)');
console.log('='.repeat(85));
const totalDmg = totalMainDmg + totalSubDmg;
console.log(`主+副总伤 = ${totalDmg}`);
console.log(`目标血量 = 51632`);
console.log(`差值 = ${totalDmg - 51632} (${((totalDmg-51632)/51632*100).toFixed(1)}%)`);
console.log(`→ ${Math.abs(totalDmg-51632) < 200 ? '✓ 完美吻合! perHit(514/27)正确' : '需检查'}`);

console.log('\n' + '='.repeat(85));
console.log('二、发数模型反推(用总命中发数 + 总时长42.5s)');
console.log('='.repeat(85));
console.log(`主武器总命中 = ${totalMainHits}发 (10艘)`);
console.log(`副武器总命中 = ${totalSubHits}发 (10艘)`);
console.log('');
// 主武器命中率(无策略靶闪避0, +30%命中)
// 武器1区间70-100%, +30%k → base×1.30, 夹95%
// 平均命中率(含夹): 之前算94.7%
const mainHitRate = 0.947; // 含95%上限
// 开火发数 = 命中发数 / 命中率
const mainShots = totalMainHits / mainHitRate;
console.log(`主武器开火发数 = ${totalMainHits.toFixed(0)} / ${mainHitRate} = ${mainShots.toFixed(0)}发`);
console.log(`每艘开火 = ${(mainShots/10).toFixed(1)}发 in 42.5s`);
const mainInterval = 42.5 / ((mainShots/10) - 1 + 0.001);
console.log(`发间间隔 ≈ ${mainInterval.toFixed(1)}s (若首@t=0)`);
console.log(`或周期(含锁定): 42.5 / ${(mainShots/10).toFixed(1)} = ${(42.5/(mainShots/10)).toFixed(1)}s`);

console.log('\n' + '='.repeat(85));
console.log('三、个体散布分析(10艘差异大!)');
console.log('='.repeat(85));
const mainHits = ships.map(s => s.main / PER_HIT_MAIN);
const subHits = ships.map(s => s.sub / PER_HIT_SUB);
console.log(`主武器命中: ${mainHits.map(h=>h.toFixed(0)).join(',')}`);
console.log(`  范围 ${Math.min(...mainHits)}~${Math.max(...mainHits)}, 均值${(mainHits.reduce((a,b)=>a+b,0)/10).toFixed(1)}`);
console.log(`副武器命中: ${subHits.map(h=>h.toFixed(0)).join(',')}`);
console.log(`  范围 ${Math.min(...subHits)}~${Math.max(...subHits)}, 均值${(subHits.reduce((a,b)=>a+b,0)/10).toFixed(1)}`);
console.log('');
console.log('⚠️ 主武器5~10发, 个体差异巨大(2倍)!');
console.log('  可能原因: ');
console.log('  A. 目标选择不同(各艘打不同目标? 但只有1个目标)');
console.log('  B. 部分斗牛被目标反击摧毁(提前停止输出)');
console.log('  C. 开火相位不同(RNG导致锁定/开火时刻不同步)');
console.log('  D. 目标在移动/脱离部分斗牛射程');

console.log('\n' + '='.repeat(85));
console.log('四、场2异常(5135)');
console.log('='.repeat(85));
console.log(`场2主武器5135, ÷514 = ${(5135/514).toFixed(3)}`);
console.log(`若含1次暴击: 5135 = 514×8 + 1028×1 = ${514*8+1028}? → ${514*8+1028===5135?'对':'不对'}`);
console.log(`若514×9=4626, 514×10=5140, 5135在中间 → 可能含1发不同perHit`);
console.log(`5135-514×9 = ${5135-514*9} → 第10发伤害${5135-514*9}而非514`);
console.log(`或5135-514×8 = ${5135-514*8} → 若9发普通+1发${5135-514*8}的`);
console.log(`→ 最可能: 5140少记1发或多记, 或有1次非整perHit(如目标护盾值变化)`);
