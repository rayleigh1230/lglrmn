# 工作笔记：ST59 装甲缺口 + 防空 skill_ratio 通道（待修）

> 日期：2026-07-09
> 状态：**诊断完成，修复待续**。本笔记记录阶段0-1 的成果 + 已定位但未修的具体缺口。
> 关联：docs/20（反编译完成）、本会话 commit fe4a63e（数据 dump + 挂载）。

---

## 一、阶段0-1 已完成（commit fe4a63e）

1. **dump 出缺失数据**（frida 实时 dump，游戏运行时）：
   - `data/client/config/cfg_weapon_num_attr.json`（34 行）—— calc_effect_add 三通道分配表
   - `data/client/tools/effect_enum_values.json`（278 个）—— EFFECT 枚举数值
   - 工具：`data/client/tools/dump_weapon_num_attr.py`（probe + dump 两模式）
2. **挂载到 store**：修 `nodeUtils.ts:68-71` stub bug（本是 weaponNumAttr 却误挂 weaponDamageType）+ `editor/loadStore.ts` 同步挂载。
3. **测试现状**：149/150 通过。`panel-comprehensive` 的 ST59 失败是**真实对齐缺口**（非预存无关问题，docs/17 §五 误判）。

---

## 二、缺口1：ST59 装甲 180≠430 / 护盾 10≠30（根因已定位）

### 真相
ST59 模块数据正确，430 = 250(6030112/36034) + 180(6030113/36031)，30 = 20(6030111/36033) + 10(6030113/36031)。
游戏默认面板**同时启用多个装甲系统**（GROUP 202 的 6030110/6030111/6030112 + GROUP 103 的 6030113）。

### 根因
`packages/engine/src/data/blueprintCalc.ts:116 resolveEnabledSystems`：
- GROUP 202（6030110/6030111/6030112，都是 `ADDITIONAL_SYS:1`）被当切换组
- 默认逻辑（L144-148）：找组内第一个 `ADDITIONAL_SYS≠1` 的成员 → 全组都是 1 → `def=undefined` → **整组不启用**
- 结果只留 GROUP 103 的 6030113（180），丢掉 6030112（250）

### 待修方向（需对照游戏真实默认行为，谨慎）
- 游戏默认面板下，装甲系统组的选择逻辑 ≠ "全可选组无默认则不启用"。可能：
  - (a) 装甲系统（SYSTEM_TYPE=4）默认全启用，不走切换组互斥
  - (b) 默认面板选每组第一个成员（而非要求 ADDITIONAL_SYS≠1）
- **必须逐测试验证**：firepower-skill-ratio / panel-comprehensive / module-assembly 等都依赖此函数，改错会连锁失败
- 锚点：ST59 装甲=430、护盾=30；FG300/斗牛等其余 8 艘的抵抗/护盾也要保持

---

## 三、缺口2：防空 skill_ratio 通道（已用反编译+枚举值厘清）

### 真相（反编译 `collect_skill_effect_ratio.py` + `effect_enum_values.json` 双证）
对 `MA_MODULE_AIR_DPS`：
- `attr_type='Tb_cfg_weapon_action.DURATION'`：`skill_effect_ratio += 12310(DUR_INC) + 12311(DUR_DEC)`
- `attr_type='Tb_cfg_weapon.CD_TIME'`：`skill_effect_ratio += 12305(CD_INC) + 12306(CD_DEC)`
- 通过 `get_module_effect_ori_value` 取模块原值，DEC 经 `get_module_effect_real_value` 取负
- 这些 EID **不在 weaponNumAttr**（不走三通道 getEnhanceAdd），走 skill_effect_ratio → 进 `(100+add_ratio+skill_ratio)/100`

### TS 现状（effectList.ts:287-296）
- 只处理 12311→`airDurReduction`、12306→`airCdReduction`，从 addRatio **减**
- **漏了 INC 变体**（12310 DUR_INC、12305 CD_INC）
- 符号约定不同：Python 是 `+skill_ratio`(=INC−DEC)，TS 是 `−reduction`(只 DEC)
- 对**只有 DEC** 的武器两者数值相同（−DEC == +(−DEC)）；对**同时有 INC+DEC** 的武器 TS 错

### 待修方向
- `AssembledWeapon` 加 `airDurSkillRatio / airCdSkillRatio`（从 module_effect 读 12310+12311 / 12305+12306 的 PARAM，DEC 取负求和）
- `computeWeaponDps` 的 duration/cd 通道：`evalEnhanceBasic` 补 skill_ratio 参数（对齐 get_after_system_effect_value 的完整公式 `(base+addBase)*(100+addRatio+skillRatio)/100+addNum`）
- 移除旧的 `airDurReduction/airCdReduction` 减法逻辑（或保留但语义对齐）
- 注意：flight/repeat 通道**无** skill_ratio（collect_skill_effect_ratio 只对 DURATION/CD_TIME）

---

## 四、其余待逐行核对（未发现确定 bug，需对照反编译确认）
- **calc_effect_add**：EFFECT_SHIP_HP(=10) 末尾 `/100`（TS getEnhanceAdd 无此逻辑）+ 等级缩放 `PARAM×cur_level×1.0/max_level` 浮点除
- **get_module_effect_real_value**：单位变换表（%100/%1000//100//5000/取负）—— TS 散落各处，确认无重复变换
- **is_valid_effect**：反编译为空但有完整 disasm（375行），逐条对照 TS isValidEffect 的 TARGET_SHIP drone/fighter/boat 分支 + energy filter + module_type 解码

---

## 五、续作顺序建议
1. 先修缺口1（装甲 switch-group）→ 让 panel-comprehensive 转绿（最高价值，解锁防御链）
2. 再修缺口2（防空 skill_ratio）→ 完整火力链
3. 逐行核对四、其余 3 函数
4. 写 docs/21 + git 提交

**数据已就位**（weaponNumAttr + 枚举值在 commit fe4a63e），后续纯算法对齐，无需再 dump。
