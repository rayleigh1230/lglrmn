# 客户端逆向实战突破 + 战斗机制白盒结论（2026-07-01）

> 作者：AI 辅助（接续 HOOK_REVIEW.md 的准备工作）
> 性质：运行时注入实战记录 + 对战斗模拟器项目的关键结论
> 前置：HOOK_REVIEW.md（Hook复盘+解密函数发现）
> 关联：F:\战斗模拟器\lglrmn\docs\04-多舰确定性与期望伤害模式交接.md

---

## 〇、TL;DR

**本轮完成了从"加密NXZ"到"可读Python对象"的完整闭环，并得到一个对战斗模拟器项目至关重要的结论：命中率/伤害判定的核心算法和数值都在服务器侧，客户端只是"按服务器下发的结果播放动画"。这从白盒角度彻底印证了04文档靠黑盒实测得出的全部结论——04文档的研究路线是对的，客户端逆向无法提供命中率算法。**

但客户端提供了：完整的武器/舰船/战斗系统类结构、武器类型枚举、DPS计算器架构、buff机制框架——这些对引擎的数据契约设计有直接参考价值。

---

## 一、注入闭环全程记录（可复现）

### 1.1 工具链
- **frida 17.15.3**（pip安装，无需编译器）+ UAC提权（游戏进程需管理员attach）

### 1.2 关键坑点（frida 17 API变更）
| 旧API（失效） | 新API（frida 17） |
|---|---|
| `Module.findExportByName(...)` | `Process.getModuleByName("dll").getExportByName(...)` |
| `Module.findBaseAddress(...)` | `Process.getModuleByName("dll").base` |
| `rpc.exports` + `exports_sync` | 直接用 `send()` 回传（避开RPC版本差异） |

### 1.3 成功链路
```
frida.attach(游戏PID) 
  → Process.getModuleByName("python311.dll").getExportByName("PyRun_SimpleString")
  → PyGILState_Ensure() 
  → PyRun_SimpleString(python代码)   ← 在游戏Python解释器里执行任意代码
  → PyImport_AddModule("__main__") + PyObject_GetAttrString 读回结果
  → PyGILState_Release()
```

### 1.4 解密路径的曲折（重要经验）
- **直接调用 `NxioImporter.decrypt_data()` 返回空** —— 因为解密需要私钥（RSA），客户端只持公钥，解密能力受限
- **正确路径：`importlib.import_module(目标模块)`** —— 让游戏的 import hook 自动解密NXZ，然后从 `sys.modules` 读已加载的模块对象
- **字节码有自定义opcode重映射**（`loader.get_code()` 报 "Invalid Code"），但**类的元数据完全可读**（co_names/co_consts/属性/方法签名）

---

## 二、★ 核心结论：战斗判定在服务器侧（白盒铁证）

### 2.1 WeaponAttackCommand 的字段（最关键证据）

从 `scene_zoom0.battle_command.battle_command_factory` 的 `WeaponAttackCommand` 类读到的字段：

```
hit_damage_count      ← 命中伤害数（服务器已算好）
miss_damage_count     ← 未命中伤害数（服务器已算好）
base_hit_damage       ← 基础命中伤害（服务器下发）
critical_hit_extra_damage  ← 暴击额外伤害（服务器下发）
anti_missile_list     ← 反导列表
after_hp              ← 攻击后血量（服务器下发）
weapon_hp             ← 武器伤害值
```

`on_create()` 里：`hit_damage_count.append(BattleDamageType.HIT)` / `miss_damage_count.append(BattleDamageType.MISS)` —— **客户端只是把服务器给的 damage_list 按 HIT/MISS/ANTI 三类分类，然后播放。**

### 2.2 与之前的证据完全一致
| 证据 | 来源 | 结论 |
|---|---|---|
| `damage_list=[-1]`（traceback） | cc70c952.script | 服务器下发的占位符 |
| `WeaponAttackCommand` 字段全是从服务器接收 | 本轮白盒 | 客户端不算命中/伤害 |
| `Tb_cfg_weapon` 无 hit/damage 字段 | 本轮扫描 | 配置表也不存这些数值 |
| 所有 `Tb_cfg_*` 表扫描无命中率字段 | 本轮扫描 | 命中率数值不在客户端 |

### 2.3 对战斗模拟器项目的意义
**04文档的核心未解问题"命中判定具体实现形式"——答案确定在服务器侧，客户端白盒无法获取。** 这意味着：
- ✅ 04文档的**黑盒实测路线是唯一可行路径**，不要在客户端逆向上投入更多
- ✅ "确定性来自无目标选择(NV1)"等结论方向正确
- ✅ 引擎实现应继续走 per-shot roll + 实测校准，不要指望从客户端抄算法

---

## 三、客户端提供的有价值资料（已dump）

### 3.1 已dump文件（`E:\星际猎人\dumped\`，共343KB）

| 文件 | 内容 | 大小 |
|---|---|---|
| 01_battle_command.txt | 战斗命令类结构(BattleCommand/WeaponAttackCommand等) | 51KB |
| 02_battle_entity.txt | 战斗实体/船组数据 | 26KB |
| 03_ship_attribute.txt | 舰船属性类(最大) | 166KB |
| 04_weapon.txt | 武器/子弹系统 | 89KB |
| 05_buff_effect.txt | buff效果 | 10KB |
| 06_weapon_action_probe.txt | 武器动作表字段 | 1.3KB |

### 3.2 武器类型枚举（common_definition，对引擎直接有用）
```python
MA_WEAPON_ARTILLERY = '火炮'      MA_WEAPON_ION = '离子'
MA_WEAPON_MISSILE = '导弹'        MA_WEAPON_PLASMA = '等离子'
MA_WEAPON_RAILGUN = '轨道炮'      MA_WEAPON_TORPEDO = '鱼雷'
MA_WEAPON_PULSE = '脉冲'          MA_WEAPON_ELECTRON = '电子'
```
DPS分类：`MA_SHIP_DPS='ship_firepower'`(对舰)、`MA_SHIP_AIR_DPS='ship_aa_firepower'`(防空)、`MA_SHIP_DESTROY_COEF_DPS='ship_siege'`(攻城)

### 3.3 DPS计算器架构（data.ship_attr_calc）
客户端有一套完整的属性计算器（用于UI显示DPS，非战斗结算）：
```
DPSCalculator / AttackCalculator / DurationCalculator
EnhanceCalculator / AfterSystemEffectCalculator
```
计算变量：`V_ATTACK`(攻击力)、`V_TOTAL_HURT`(总伤害)、`V_ATK_INTERVAL`(攻击间隔)、`V_ADDITIONAL_DPS_DPH`(额外DPS单发)
注意：这套计算器的输出是"理论DPS"（UI显示用），**不是战斗中的实际命中/伤害序列**。

### 3.4 WeaponAttackCommand 的完整调用链（播放侧）
```
execute(scene):
  → ShipDataMgr.get(ship_uid)  取攻击方
  → attacker._attack_with_weapon(weapon_id, anti_missile_list)
     → ShipResPropertyMgr.get_bullet_param_by_weapon_id(ship_id, slot_index)  ← 取子弹参数
     → attacker.attack_with_weapon(command_id, weapon_id, target, duration, damage_list, ...)
  → get_battle().preprocess_data(...)
  → BattleShipGroupDataMgr.check_and_consume_focus_fire_line(...)  ← 集火逻辑
  → buff_effect.BuffEffectFocusFireLine  ← 集火buff
```

---

## 四、对引擎实现的建议

基于白盒结论，给战斗模拟器的具体建议：

### 4.1 可直接采用
1. **武器类型枚举**（§3.2）—— 引擎的 WeaponCategory 可直接对齐这8种
2. **AttackCommand数据结构** —— 引擎事件日志可对齐字段名(command_id/weapon_index/target_ship_uid/duration/damage_list/anti_missile_list)
3. **BattleDamageType** 三分类（HIT/MISS/ANTI）—— 引擎伤害结算可对齐
4. **DPS三分类**（对舰/防空/攻城）—— 引擎DPS计算可对齐

### 4.2 确认不要做
1. ❌ 不要从客户端找命中率算法（确认在服务器侧）
2. ❌ 不要落地"连续期望伤害分支"（04文档已废，本轮白盒再次确认判定在服务器）
3. ❌ 不要试图解密NXZ拿源码（字节码有自定义opcode，且战斗判定不在客户端）

### 4.3 04文档结论的独立印证
本轮白盒从代码结构层面**独立印证**了04文档的核心结论：
- "伤害是离散的" ← `BattleDamageType.HIT/MISS` 离散分类
- "确定性来自无目标选择" ← 客户端只播放，目标选择在服务器
- "damage_list是服务器下发的" ← WeaponAttackCommand字段全是接收的

---

## 五、可复用的工具（保留在 E:\星际猎人\）

| 脚本 | 用途 |
|---|---|
| `inject_probe3.py` | **frida 17正确API的注入模板**（验证通道，最基础） |
| `batch_dump3.py` + `_dump_logic.py` | **批量dump模块**（可改模块列表重跑） |
| `npk_slicer.py` | NPK切片定位战斗模块 |
| `HOOK_REVIEW.md` | 完整的Hook复盘+NXZ格式+解密函数分析 |

**复用方法**：游戏启动→登录主界面→管理员运行 `batch_dump3.py`（改 `_dump_logic.py` 里的 GROUPS 字典即可dump任意模块）。

---

## 六、未尽的探索（如需可续）

游戏还开着时可继续做的（优先级低，因核心问题已答）：
1. dump `Tb_cfg_weapon_action` 的 `action`/`action_param` 完整记录（可能含单发伤害数值，用于UI显示）
2. 解析 `data.ship_attr_calc` 各 Calculator 的 calculate() 实现（理论DPS公式，对模拟器校准有参考价值）
3. dump `Tb_cfg_ship` 的完整字段（舰船血量/护盾等结构值）

但这些都不是命中率算法，价值有限。
