# 结构值联动 —— 已解决（分层模型 + EID=10 万分比）

> 日期：2026-07-04
> 状态：**✅ 已修复**（模块结构值联动实装，公式精确验证）

## 一、问题回顾

切换超主力舰的可选模块（如乌拉诺斯之矛的 C2 附加装甲）时：
- ✅ 抵抗值、护盾值、火力 正确联动（此前已修复）
- ❌ 结构值 不联动（装 C2 后游戏面板 180470→212954，模拟器仍显示 180470）

**C2 附加装甲（weaponId=36052）给舰船结构值加成 32484。** 装上后总结构值 = 180470 + 32484 = 212954。

## 二、根因（上一轮的错误结论已推翻）

### ❌ 上一轮的错误判断
上一轮调查把 `cfg_module_effect` 的 **EFFECT_ID=10** 标注为"战后修复18%（战斗结算层，非面板结构值）"，结论是"32484 不在任何配置表里，是运行时计算的"。

**这个判断完全错误**。错误根源：被 EID=10 的 DESC 文案（"每次战斗结束后自动修复18%"）误导，误以为是战斗内修复机制。

### ✅ 正确结论
**EFFECT_ID=10 = "舰船结构值提高"（`cfg_effect_def[10][1]`），PARAM 是万分比，直接提升面板基础结构值。**

公式：
```
moduleStructureBonus = floor(baseStructure × Σ(EID=10 PARAM) / 10000)
```

验证（60501 + 模块36052）：
```
180470 × (1800 / 10000) = 180470 × 0.18 = 32484.6 → 32484
180470 + 32484 = 212954  ✓ 与游戏面板完全一致
```

## 三、客户端规则（已彻底厘清）

### 三大基础属性完全平行，都从 `cfg_module_effect` 取

| 属性 | EFFECT_ID | PARAM 单位 | 计入方式 | 示例 |
|------|-----------|-----------|---------|------|
| 抵抗 | 10033 | 绝对值 | 直接加 | 240 |
| 护盾 | 10021 | 百分比 | 直接加 | 5 (=5%) |
| **结构** | **10** | **万分比** | **base × PARAM/10000** | 1800 (=18%) |

对全部 88 个装甲类模块（3XXXX）扫描确认：只有 7 个"附加装甲/纳米修复"类模块带 EID=10，大多数装甲模块只给抵抗+护盾。

### 7 个带结构加成的装甲模块（全部精确验证）

| 模块 | 名称 | PARAM | 比例 | 示例舰船 |
|------|------|-------|------|---------|
| 33053/33054 | AST纳米修复 | 1500 | 15% | — |
| 34052 | ASX-30附加装甲 | 1000 | 10% | 41202: 37090→40799 |
| 34053 | ASX-90重型附加装甲 | 1500 | 15% | 70501: 240460→276529 |
| 36032 | ASX-100附加装甲 | 2000 | 20% | 60301: 136510→163812 |
| 36052 | ASX-150强效纳米 | 1800 | 18% | 60501: 180470→212954 ✓ |
| 36053 | ASX-150强效纳米 | 1000 | 10% | 97201: 284970→313467 |

### ⚠️ 两套表的 EID=10 命名空间（易混淆点）

客户端有**两张表**都用到 EFFECT_ID=10，必须区分：

| 表 | EID=10 含义 | PARAM 形式 | 作用层 |
|----|------------|-----------|--------|
| `cfg_module_effect` | 模块给的结构加成 | 直接 PARAM（万分比）| **模块层**（本次修复）|
| `cfg_system_effect` | 强化项"龙骨结构增强" | `PARAM_LEVEL` 等级表 | 强化层（已做巅峰路径）|

docs/06 第103行把两者混为一谈了，这是之前调查走偏的根源。

### 客户端 hp_max 存储模型

从客户端 dump（`03_ship_attribute.txt`）的 `ShipField` 类确认：
- `HP_MAX = 'hp_max'`：玩家实例最终结构值（装配时算好存的）
- `MODULES = 'modules'`：装配的模块串
- `MODULE_EFFECT = 'module_effect'`：模块效果串
- `EFFECTS_ADDITION` / `EFFECTS_ENHANCED` / `EFFECTS_PEAK_LEVEL`：强化/巅峰效果

客户端计算逻辑在加密字节码里（opcode 被重映射，无法还原公式），但数据契约明确：modules + module_effect 决定 hp_max。

## 四、分层模型（用户确认）

```
Layer 0【出厂骨架】 cfg_ship[4] = baseStructure
        本身是固定模块的产物，代码里绝对不改这个值
Layer 1【可选模块】 moduleStructureBonus（EID=10 万分比 × Layer0）
        → skeletonStructure = baseStructure + moduleStructureBonus
Layer 2【软件加成】 强化(permille) × skeleton + 巅峰(绝对值) + 技术值(绝对值)
        → finalStructure
```

核心原则：**baseStructure（cfg_ship[4]）在代码里完全不被触碰**——字段、变量、resolver内部一律不改写。模块加成纯粹上层叠加。强化系数作用于"完整骨架"（skeleton），符合"强化作用于整个舰船"的语义。

## 五、本次修复内容

### 代码改动

| 文件 | 改动 |
|------|------|
| `packages/engine/src/data/blueprintCalc.ts` | `getBaseDefense` 新增 `structurePermille` 返回值（EID=10 万分比聚合）；`BlueprintPanel` 新增 `baseStructure`/`moduleStructureBonus` 字段；`resolveBlueprintPanel` 计算 skeletonStructure |
| `packages/engine/src/data/blueprintResolver.ts` | `BlueprintOptions` 新增 `moduleStructureBonus?` 参数；`ResolvedBlueprint` 新增 `moduleStructureBonus` 字段；`finalStructure` 公式改为 `floor(skeleton × (1+permille)) + peak + version` |
| `packages/editor/src/data/blueprintSelector.ts` | `getShipPanel` 从 module_effect 算 moduleStructureBonus 传给 resolveBlueprint |

### 测试

- `tests/data/module-structure.test.ts`（新增，22 断言全绿）：
  - 60501 默认无加成 / 装模块36052 → skeleton=212954
  - 姊妹舰一致性（60101/63501/66501）
  - resolveBlueprint 向后兼容（不传 moduleStructureBonus 默认0）
  - 其他装甲模块（41202+34052）
- `tests/data/enhance-system.test.ts`（新增，强化数据层测试，28 断言全绿）

### 向后兼容性

- 现有 9 个测试**未引入新破坏**（baseStructure 语义不变，moduleStructureBonus 默认0）
- 唯一失败的 `panel-comprehensive.test.ts` ST59 抵抗/护盾断言是**预存问题**（git stash 验证：改动前就失败），与本次无关——ST59 的 GROUP 202 装甲模块在测试环境（不传 enabledSlots）默认不装配，导致抵抗/护盾/结构都低于游戏面板值。这是模块切换重构的已知行为，需单独修正测试期望值。

## 六、验证

```
npm test -w @lagrange/engine
→ 128 测试，127 通过，1 失败（预存 ST59 问题）
npm run build -w @lagrange/engine
→ 编译通过，无错误
```

手动验证：dev server 选 60501 + 装模块36052（C2 附加装甲），面板结构值应显示 212954，切换装甲模块时结构值与抵抗/护盾联动。

## 七、相关文件

- `packages/engine/src/data/blueprintCalc.ts`：`getBaseDefense`/`resolveBlueprintPanel`（结构分层计算 + repairGain）
- `packages/engine/src/data/blueprintResolver.ts`：`resolveBlueprint`（moduleStructureBonus 参数 + skeleton 公式 + countInstallTechPoints）
- `packages/engine/src/data/enhanceSystem.ts`：强化数据层（`resolveEnhanceSystem`/`getEnhanceValue`/`isEnhanceAvailable`/`resolveEnhanceTree`）
- `data/client/config/cfg_module_effect.json`：模块效果表（EID=10 结构加成数据源）

## 八、追加修正（2026-07-04 续）

### 版本号结构加成修正
- ★**超主力舰（战巡/航母/战列/支援）无版本号结构加成**——cfg_ship_type[9]=0
- 实测铁证：CV3000(航母) finalStructure=278340×1.33=370192，纯强化系数零版本加成
- cfg_ship_type[10]=50 不是结构加成用途（待定）
- 普通舰（护卫/驱逐/巡洋）用[9]（驱逐=40），版本号加成 = 总科技点 × shipHpAdd

### cfg_ship[11] 字段修正
- 之前误标 `slot_row_count`，实际是 **ship_type（舰种）**
- 白名单169艘全验证：60501[11]=6(战巡)/40501[11]=4(驱逐)/80201[11]=8(航母)
- 删除了 inferShipType（舰名正则），全部改用 cfg_ship[11] 字段判定

### 受维修量提升属性
- 公式：`repairGain% = 装甲抵抗值(模块+强化) × 舰种系数`
- 系数：护卫0.05/驱逐0.1/巡洋0.2/超主力0.25/战机护航艇0
- 系数来源 REPAIR_ADJUST_COEF 不在配置表/代码对象中（frida多路径确认），硬编码
- 实测：斗牛2%+1.6%=3.6% ✓ / 天枢390×0.25=97.5% ✓

### 巅峰强化奖励 field[1]
- field[1] = `"enhanceId,level;..."` 巅峰专属强化项（optIdx=70/71）
- 解析链：enhanceId→systemEnhance.SYS_PREFIX→systemEffect[prefix+"01"]→PARAM_LEVEL
- 结构加成(EID=10)叠加到 structureBonusPermille
- bull-panel 期望值修正：45948→46669（含field[1]的2%）

