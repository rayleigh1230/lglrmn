# 战斗数据流与动画机制白盒分析（2026-07-01）

> 作者：AI 辅助（基于客户端运行时注入dump）
> 目的：通过客户端收到的数据结构和动画播放逻辑，厘清"服务器算什么、客户端演什么、每个动作代表什么"，从而明确战斗模拟器引擎的算法复刻路线
> 数据来源：`D:\无尽的拉格朗日\dumped\*.txt`（运行时从游戏Python解释器dump）
> 关联：F:\战斗模拟器\lglrmn\docs\04-多舰确定性与期望伤害模式交接.md

---

## 〇、核心洞察

**客户端是一个"确定性回放器"**：服务器把整场战斗计算完毕后，以"命令序列"(Command Stream)的形式下发给客户端，客户端按时间轴逐条执行命令、播放动画。客户端不做任何影响战斗结果的计算——它只负责"把服务器给的剧本演出来"。

这意味着：**我们复刻引擎的本质，是复刻服务器的命令生成逻辑**——即"给定双方配置，生成正确的命令序列"。客户端的命令结构就是我们要生成的"目标输出格式"。

---

## 一、战斗的完整数据流

### 1.1 服务器→客户端：命令序列（Command Stream）

服务器把一场战斗编码为一串 `BattleCommand`，每条命令 = `(team_id, action_id, command_data)`。

**命令协议层**（`BATTLE_COMMAND_DICT`，已完整dump）：

| cmd_id | 命令类 | flag | 含义 |
|---|---|---|---|
| 1 | WeaponAimCommand | True | **武器瞄准**（锁定目标，开始前摇） |
| 2 | WeaponAttackCommand | True | **武器攻击**（一次完整攻击：含命中/未命中/伤害） |
| 3 | ShipDeadCommand | True | 舰船被击毁 |
| 4 | AircraftMoveCommand | True | 舰载机移动 |
| 5 | WeaponInterfereCommand | True | 武器干扰（电子战） |
| 6 | ShipMoribundCommand | True | 舰船濒死（血量归零但未死） |
| 7 | ShipRepairCommand | True | 舰船维修 |
| 8 | ShipSkillCommand | True | 舰船技能释放 |
| 9 | ShipRowCommand | True | 舰船变换队列位置 |
| 12 | ShipWeaponAttackRoundCommand | False | **武器攻击轮次**（特殊弹药轮） |
| 13 | ShipSystemDestroyCommand | False | **子系统被摧毁**（武器/模块被打掉） |
| 14 | ShipSkillAddBuffCommand | True | 技能添加buff |
| 17 | WeaponAttackBurstCommand | False | **武器爆发攻击**（对子系统） |
| 19 | WeaponStateChangeCommand | True | 武器状态变化（如武器被打哑） |
| 20 | EarlyWarningCommand | True | 预警（被锁定） |
| 24 | ShipGroupTacticalOperationCommand | False | **战术操作**（集火/部署等玩家指令） |
| 26 | ShipReviveCommand | True | 舰船复活 |
| 29 | ShipHPUpdateCommand | False | **HP同步更新** |
| 30 | ShipTakeCoverCommand | True | 舰船掩蔽 |
| 34 | ShipDroneShieldHpChangeCommand | False | 无人机护盾HP变化 |
| 10001 | BattleCommandPack(打包) | — | 多命令打包 |

`flag=True` 的命令是"关键动作"（参与战斗逻辑展示），`flag=False` 是"辅助同步"（纯数据更新）。

### 1.2 战斗结束原因（`battle_action`，已dump）
```
END_BATTLE_REASON_LOSE=2            战败
END_BATTLE_REASON_INTERRUPT=3       中断
END_BATTLE_REASON_LOST_ENEMY=6      敌方丢失
END_BATTLE_REASON_ENEMY_RETREAT=8   敌方撤退
END_BATTLE_FIGHT_COMPLETE=36        战斗完全结束
```
**关键：`FIGHT_COMPLETE=36`** —— 服务器明确下发"战斗结束"，客户端不自行判断。

---

## 二、★ WeaponAttackCommand 的完整解构（核心）

这是出现最频繁、信息量最大的命令。它一条 = 一次武器开火攻击。

### 2.1 服务器下发的字段（`parse_data` 按固定索引解析 command_data）

| 索引 | 字段 | 类型 | 含义 | 引擎对应 |
|---|---|---|---|---|
| 0 | ship_uid | int | 攻击方舰船唯一ID | attacker |
| 1 | slot_index | int | 武器槽位(101/202/203/304/405) | weapon slot |
| 2 | group_index | int | 武器组(舰载机群) | weapon group |
| 3 | target_ship_uid | int | 目标舰船 | target |
| 4 | target_slot_index | int | 目标槽位(打哪个子系统) | target subsystem |
| 5 | duration | int(ms) | **本次攻击持续时间** | ★ 攻击周期 |
| 6 | hit_damage_count | list | **命中伤害数列表** | hits sequence |
| 7 | miss_damage_count | list | **未命中数列表** | misses sequence |
| 8 | anti_missile_list | list | 反导拦截列表 | interceptions |
| 9 | after_hp | int | **攻击后目标剩余HP** | resulting hp |
| 10 | multi_target_index | int | 多目标索引(溅射) | splash target |
| 11 | weapon_hp | int | **本次武器伤害总值** | total weapon damage |
| 12 | critical_hit_extra_damage | int | **暴击额外伤害** | crit bonus |
| 13 | base_hit_damage | int | **基础命中伤害** | base damage |

### 2.2 damage_list 的三种伤害类型（`BattleDamageType`，已确认枚举值）
```python
BattleDamageType.HIT  = 1    # 命中
BattleDamageType.MISS = -1   # 未命中
BattleDamageType.ANTI = -2   # 被反导拦截
```

`on_create()` 把 `damage_list` 按类型拆分：
```python
for d in damage_list:
    if d == HIT:    hit_damage_count.append(HIT)
    elif d == MISS: miss_damage_count.append(MISS)
    elif d == ANTI: anti_missile_list.append(ANTI)
```

**这就是服务器下发的逐发命中/未命中序列！** 每个元素代表一发弹药的结果。

### 2.3 对 04 文档谜题的直接回答

**04文档的"伤害是离散的(每命中扣perHit整数倍)"** ← 完全吻合。`damage_list` 是离散的 `[HIT, HIT, MISS, HIT, ANTI, ...]` 序列，每发独立判定。

**04文档的"damage_list=[-1]"** ← 那是**舰载机层**的 AttackCommand（cc70c952.script里的）。舰载机用占位符-1，真正的逐发序列在**舰船层**的 `WeaponAttackCommand` 里（索引6/7是列表）。

---

## 三、★ 动画播放机制：子弹如何对应服务器数据

### 3.1 子弹(Bullet)的生成逻辑

`WeaponAttackCommand.execute()` 调用 `_attack_with_weapon(attacker, weapon_id, anti_missile_list)`：
```
→ ShipResPropertyMgr.get_bullet_param_by_weapon_id(ship_id, slot_index)  // 取子弹参数(速度/数量/间隔)
→ attacker.attack_with_weapon(command_id, weapon_id, target, duration, damage_list, ...)
```

然后 `attack_with_weapon` 按 `bullet_param` 的 `launch_count`/`launch_interval`/`launch_delay_time` 逐发生成子弹。

### 3.2 一发子弹携带什么（Bullet类核心字段）
```
_damage              ← 这发的伤害(BattleDamageType.HIT/MISS 决定是否真伤害)
_is_anti_missile     ← 是否反导弹药
_launch_index        ← 发射点索引(第几发)
_hit_index           ← 命中点索引(打在船的哪个位置)
bullet_type          ← 子弹类型(LINE/LINK/MISSILE/FISSION...)
bullet_param.speed    ← 飞行速度(纯视觉)
bullet_param.launch_count / launch_interval  ← 发射数量/间隔(纯视觉时序)
```

### 3.3 关键：子弹的"命中/未命中"由服务器数据决定，不是飞行中判定

子弹创建时 `_damage` 已被设为 HIT 或 MISS：
- **HIT**：子弹飞到目标，播放命中特效 + `do_damage_and_play_hit` + `get_all_dagage` 扣血
- **MISS**：子弹飞向 `get_mishit_world_position()`（擦边位置），播放未命中特效，**不扣血**

**子弹飞行纯粹是视觉表演，命中结果在创建时就定了**（来自服务器的 damage_list）。

### 3.4 武器类型→子弹飞行方式（BulletType → 视觉路径）
```
LINE          → 直线飞行(StraightMoveComp)        ← 火炮/轨道炮
LINK          → 链接式(瞬间光束,LinkCtrlComp)       ← 能量武器
LINK_FLY      → 链接飞行(有飞行物)
MISSILE       → 追踪导弹(MissileMoveComp,曲线)      ← 导弹
FISSION       → 分裂弹(中途分裂成多发)              ← 鱼雷/分导弹
GPU_*         → GPU批量渲染(大量子弹优化)
```

---

## 四、★ 战报时长结构的白盒解释（回答04文档§1.3）

### 4.1 duration 字段 = 服务器控制的攻击周期

`WeaponAttackCommand.duration`（索引5）是服务器下发的**本次攻击持续毫秒数**。客户端用这个值控制子弹发射时序和动画长度。

### 4.2 为什么"战报时长 = DES击毁时刻 + 后摇"

- 客户端收到命令序列后，按 `action_id`（时间戳序）逐条执行
- 最后一条 `ShipDeadCommand`（cmd_id=3）触发死亡动画
- 死亡动画有固定后摇（`do_die` → 播放爆炸特效）
- **战报总时长 = 最后一条命令的时间点 + 死亡后摇**

这印证了04文档"战报时长=击毁时刻+后摇5s"——后摇是客户端动画的固定时长，不是服务器数据。

### 4.3 为什么"6s切线不可信"

子弹的 `launch_interval`/`launch_delay_time` 是**视觉发射间隔**，与服务器实际开火周期解耦。客户端可以调整视觉节奏（如压缩/拉伸），所以从伤害曲线切线推前摇不可靠——04文档这个结论完全正确。

---

## 五、★ 对"确定性"现象的白盒解释（回答04文档§3.5）

### 5.1 NV1可复现的真正原因

客户端的 `NxioImporter` 加载脚本时用固定密钥解密 → 同样的NXZ产生同样的Python代码 → 同样的命令处理逻辑。但这与"战斗可复现"无关。

**战斗可复现是因为：命令序列是服务器预先算好的**。客户端收到什么命令，就演什么。NV1时服务器对单靶的计算结果稳定（无目标选择分叉），所以重跑得到的命令序列相同 → 演出相同。

### 5.2 NVN不可复现的原因

服务器在多目标场景做"目标选择"时引入随机（跨排转火分叉）→ 每场生成的命令序列不同 → 客户端演出不同。

**关键：随机性在服务器生成命令序列时就已经决定了，不在客户端。** 客户端从头到尾都是确定性的回放器。

### 5.3 对"命中判定形式"的推断

既然客户端 `damage_list` 是离散的 `[HIT,MISS,HIT,...]`，且04文档已证明N≥2时这个序列可复现（NV1场景）——那么**服务器的命中判定在NV1时必然是某种确定性规则**（否则不会可复现）。这与04文档§3.5的结论一致，且现在我们知道：这个规则输出的就是 `damage_list`。

---

## 六、★ 子系统摧毁机制（ShipSystemDestroyCommand，cmd_id=13）

```
字段: ship_uid, slot_index(被摧毁的武器槽), group_index
execute: ship_manager.get_ship → get_weapon_system_by_slot → 标记武器系统被摧毁
```

这对应04文档提到的"子系统摧毁"机制。服务器精确下发"哪个武器槽在什么时候被打掉"，客户端据此让该武器停止动画。

`WeaponAttackBurstCommand`(cmd_id=17) 是针对子系统的爆发攻击：
```
字段: ship_id_u, weapon_index, group_index, target_ship_id_u, target_weapon_index, damage, weapon_hp
execute: do_damage_weapon_system(target_weapon_index, weapon_hp)  ← 直接对子系统扣血
```

---

## 七、战术操作与集火（ShipGroupTacticalOperationCommand，cmd_id=24）

这是**玩家指令**的载体（玩家点"集火"/"部署"等）：
```
字段: op_id, src_team_id, exec_info_list, target_team_id, target_info_list, row_idx_when_use
```
`TacticalOperationTag` 有 `MOVE`/`DEPLOY`/`FOCUS` 等：
- **FOCUS** → `register_focus_fire_line`（注册集火线）
- **DEPLOY** → `push_tac_op_command`（部署指令）

集火由 `BuffEffectFocusFireLine` 实现（在 WeaponAttackCommand.execute 里 `check_and_consume_focus_fire_line`）。

**意义**：集火是服务器侧的buff机制，客户端只是播放集火特效 + 按服务器给的伤害执行。

---

## 八、★ 对战斗模拟器引擎算法路线的明确建议

基于以上白盒分析，引擎复刻的"目标输出"应当是**生成与服务器等价的命令序列**。具体路线：

### 8.1 引擎的核心数据结构应对齐客户端协议

引擎不模拟子弹飞行/动画，但应产出与服务器等价的"命令流"：
```typescript
type BattleCommand =
  | { cmd: 1, ship_uid, slot_index, target_ship_uid }           // WeaponAim
  | { cmd: 2, ship_uid, slot_index, target_ship_uid,             // WeaponAttack
      duration, damage_list: DamageType[], after_hp,
      weapon_hp, base_hit_damage, critical_hit_extra_damage }
  | { cmd: 3, ship_uid }                                         // ShipDead
  | { cmd: 13, ship_uid, slot_index }                            // SystemDestroy
  | { cmd: 29, target_ship_uid, after_hp }                       // HPUpdate
  | ...
type DamageType = 1 | -1 | -2   // HIT | MISS | ANTI
```

这样引擎的输出就能直接喂给一个"回放器"验证，且字段语义与真实游戏一致。

### 8.2 引擎要复刻的核心计算（=服务器的职责）

1. **武器开火调度**：何时哪个武器开火（瞄准→攻击周期→冷却）
2. **命中率判定**：生成 `damage_list`（每发 HIT/MISS/ANTI）—— 这是04文档的核心未解问题
3. **伤害计算**：`base_hit_damage`/`critical_hit_extra_damage`/`weapon_hp`
4. **目标选择**：多目标时选谁（NVN随机源）
5. **子系统摧毁**：哪个武器槽何时被打掉
6. **buff/技能**：集火、维修、技能释放时机

### 8.3 引擎不需要复刻的（=客户端的职责）

1. ❌ 子弹飞行/动画
2. ❌ 视觉特效/音效
3. ❌ 相机/镜头
4. ❌ 死亡爆炸动画（但需触发 ShipDeadCommand）

### 8.4 对04文档各结论的印证状态（白盒角度）

| 04文档结论 | 白盒印证 | 证据 |
|---|---|---|
| 命中率=加法公式 | ⚠️ 无法直接印证(在服务器) | 但damage_list是离散HIT/MISS序列 |
| 伤害离散 | ✅ 印证 | damage_list每发独立HIT/MISS/ANTI |
| NV1可复现=无目标选择 | ✅ 印证 | 客户端是回放器,可复现性来自服务器命令序列稳定 |
| 战报时长=击毁+后摇 | ✅ 印证 | ShipDeadCommand后的死亡动画固定时长 |
| 6s切线不可信 | ✅ 印证 | 子弹launch_interval是视觉参数,与服务器周期解耦 |
| damage_list=[-1] | ✅ 解释 | 那是舰载机层占位;舰船层是完整HIT/MISS列表 |
| 命中判定具体形式未知 | ⚠️ 仍未知 | 在服务器,客户端只能看输出(damage_list) |

---

## 九、下一步可深挖的方向（游戏还开着时）

如果需要更精确的"动作机制"，还可以dump：
1. **运行中战斗的实例**：hook `BattleCommandFactory.create`，抓真实命令序列（能看到实际 damage_list 数值）
2. **`tactic_battle_mgr`**：战术战斗管理器（execute_on_tactic_mgr 的接收方，可能有战斗节奏控制）
3. **`battle_footage`**（战报回放）：战报是怎么存储和回放的（关联04文档的战报研究）

但这些是锦上添花，核心的"动画↔计算"对应关系已经清晰。
