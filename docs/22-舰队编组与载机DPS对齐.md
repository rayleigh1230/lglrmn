> 日期：2026-07-09
> 范围：舰队编组数据层 + 舰载机/无人机 DPS 公式回填（get_aircraft_dps）+ 指挥值校验
> 策略：按反编译客户端源码直接对齐（data.ship_attr_calc.AttrCalcBase + common.ship_utils + common.team_utils）
> 关联：docs/17、docs/21（蓝图对齐总账，get_aircraft_dps 此前 deferred）、docs/12（火力研究）、HANDOVER-20260708（编组数据模型）

# 22. 舰队编组与载机 DPS 对齐

## 一、背景与缺口

蓝图系统已完工（docs/21 逐函数对齐总结），但留有**唯一已知公式缺口**：
`get_aircraft_dps`（母舰搭载舰载机/无人机的 DPS 递归）在 docs/17 §四、docs/21 L87 标记为
deferred。本轮设计舰队编组功能时一并回填，使 `BlueprintPanel.firepower` 完整对齐客户端
`get_ship_dps` 全公式。

```
get_ship_dps（客户端 AttrCalcBase.get_ship_dps）:
  ship_dps = int( Σ_weapon floor(weapon_dps) × AIRCRAFT_GROUP_NUM )
           + get_aircraft_dps(dps_type, all_effects_list, cur_enhance_dic)   ← 此前缺失
```

同时建立编组数据层：指挥值校验（对齐 `get_team_capacity`）+ 舰队火力/结构聚合。

## 二、客户端函数 ↔ TS 函数映射表

| 客户端函数（反编译） | TS 实现 | 文件 | 对齐状态 |
|---|---|---|---|
| `AttrCalcBase.get_aircraft_dps` | `computeAircraftDps` | `blueprintCalc.ts` | ✓ 对齐（双轨扩展） |
| `AttrCalcBase.get_ship_dps`（载机项） | `resolveBlueprintPanel` 末尾 `+= computeAircraftDps` | `blueprintCalc.ts` | ✓ 对齐 |
| `AttrCalcBase._filter_drone_enhance` | （简化：载机用空 effectList） | `blueprintCalc.ts` | △ 简化（面板基线载机无额外强化） |
| `common.ship_utils.get_ship_capicity` | `getShipCapacity` | `fleetFormation.ts` | ✓ 对齐（模块容量通道，强化通道待扩展） |
| `common.team_utils.get_team_capacity` | `getTeamCapacity` | `fleetFormation.ts` | ✓ 对齐 |
| `game_data_utils.get_module_attr_value`（MA_MODULE_CAPACITY） | `getModuleCapacity`（EID=2034） | `fleetFormation.ts` | ✓ 对齐（2035 数据 0 行暂略） |
| UI 层逐船求和（无单一 fleet 函数） | `resolveFormation` | `fleetFormation.ts` | ✓ 对齐 |
| `parse_cfg_str_to_dict_of_list`（AIRCRAFTS） | `strToAircrafts` / `aircraftsToStr` | `editor/codec/aircraftsCodec.ts` | ✓ 对齐 |

## 三、DRONE_EFFECT_IDS 推导（关键常量）

客户端 `common_definition.DRONE_EFFECT_IDS` 在反编译源码中仅被引用（3 处），无赋值语句
（Decompyle++ 不拆分模块级常量）。经字节码提取 dump `data/client/tools/effect_enum_values.json` 确认：

| EFFECT_ID | 枚举名 | 含义 | PARAM 编码 |
|---|---|---|---|
| 2020 | EFFECT_CARRIER | 搭载战机（机库） | class×100 + count（class 2=中型/3=大型） |
| 2021 | EFFECT_CARRIER_BOAT | 搭载护航艇（坞舱） | count（class 0） |
| 2022 | EFFECT_DRONE | 搭载无人机 | ship_id×100 + count |
| 2023 | EFFECT_ACCOMPANY_DRONE | 伴飞无人艇 | ship_id×100 + count |
| **2024** | EFFECT_CARRIER_EFFECT_LIMIT | **机库容量限制标记** | — **必须排除** |

**结论**：`DRONE_EFFECT_IDS = {2020, 2021, 2022, 2023}`，2024 是陷阱（非载机来源）。

PARAM 解码：`ship_id = PARAM / 100`，`num = PARAM % 100`。
- 2022/2023 的 `PARAM//100` 是具体 ship_id（84/84 全部存在于 cfg_ship，实证）。
- 2020/2021 的 `PARAM//100` 是 class 码（2/3），**不在 cfg_ship**——需玩家 aircrafts 覆写才能解析具体载机。

## 四、缺陷账

### 缺陷1【严重·已修】blueprintSelector 指挥值字段错误
- **现象**：`ShipPanelData.command`（指挥值）取 `shipRow[7]`（武器槽数，值 3-55），非真实指挥值。
- **客户端真相**：`CfgShipField.EXPLOIT_CAPACITY = 'exploit_capacity'`，位于 cfg_ship 索引 **[13]**（`03_ship_attribute.txt:1497/1517`）。
- **数据实证**：80101 太阳鲸 [13]=130000、80201 CV3000 [13]=150000、护卫 1000-2200、战机/无人机=0；而 [7] 全为 3-55 小数。
- **修复**：`blueprintSelector.ts:232` `shipRow[7]` → `shipRow[13]`；`rawTypes.ts` SHIP 常量补 `EXPLOIT_CAPACITY: 13`。
- **测试**：`capacity.test.ts`「cfg_ship[13] 是 EXPLOIT_CAPACITY」断言通过。

### 缺陷2【中·已修】get_aircraft_dps 缺口（蓝图系统遗留）
- **现象**：`computeFirepower` 只算 `Σ weapon×group_num`，缺 `+ get_aircraft_dps` 项（docs/17/21 deferred）。
- **客户端真相**：见 §五 公式。
- **修复**：`blueprintCalc.ts` 新增 `computeAircraftDps` + `resolveBlueprintPanel` 末尾回填 3 个 dpsType。
- **测试**：`aircraft-dps.test.ts` 10 项全通过；CV3000 启机库后面板对舰 6500→8750（载机贡献 2250）。
- **回归**：`firepower-anchor.ts` 无载机武器结果不变（FG300 等）。

### 缺陷3【低·已知简化】_filter_drone_enhance 未完整实现
- **现状**：载机递归用空 effectList（载机自身模块效果由 resolveShipWeapons 内部补回），未实现母舰强化过滤。
- **影响**：面板基线载机（无额外强化）结果正确；母舰强化影响载机的场景（如强化"载机伤害"类词条）暂未对齐。
- **后续**：需用 `systemEffectEnhanceData` 表重建 effect 链触达 DRONE_EFFECT_IDS 的判定。

## 五、核心公式

### 5.1 舰载机 DPS 递归（对齐 get_aircraft_dps）
```
computeAircraftDps(store, shipId, enabledSlots, dpsType, aircraftsOverride?):
  aircraftMap = {}
  if aircraftsOverride 非空:                          # 玩家覆写路径（双轨）
    for shipIdA, counts in aircraftsOverride:
      if shipIdA in cfg_ship: aircraftMap[shipIdA] += Σcounts
  else:                                               # 模块路径（对齐面板）
    for {effectId, param} in collectDroneEffectsFromShip(shipId, enabledSlots):
      if effectId ∈ DRONE_EFFECT_IDS:
        acShipId = param / 100; num = param % 100
        if acShipId in cfg_ship: aircraftMap[acShipId] += num   # 跳过 class 码
  total = 0
  for acShipId, num in aircraftMap:
    acWeapons = resolveShipWeapons(acShipId)          # 载机当独立船装配武器
    acFp = computeFirepower(acWeapons, [], store)     # 递归（含载机自身 group_num）
    total += (dpsType 取 antiShip/antiAir/siege) × num
  return total
```

### 5.2 指挥值/容量（对齐 get_ship_capicity）
```
getShipCapacity(store, shipId, enabledSlots, enhanceLevels?):
  baseCapacity = cfg_ship[13]                         # EXPLOIT_CAPACITY（非 [7]）
  # MA_SHIP_CAPACITY 强化通道（EFFECT_EXPLOIT_CAPACITY=EID20）：待扩展
  moduleCapacity = Σ over enabled cat=0 modules:
    install_num × EFFECT_MODULE_CAPACITY(EID=2034)    # MA_MODULE_CAPACITY
    # EID=2035(INC 比例) 数据 0 行，暂略
  return floor(baseCapacity + moduleCapacity)

getTeamCapacity(store, team, ships):
  return Σ_member getShipCapacity(ship)
```

### 5.3 舰队聚合（对齐 UI 层逐船求和）
```
resolveFormation(store, team, ships, capacityCap?):
  for uid in team.memberUids:
    panel = resolveBlueprintPanel(shipId, enabledSlots, aircrafts)  # 含回填载机 DPS
    capacity = getShipCapacity(shipId)
    totalFirepower += panel.firepower
    totalStructure += panel.finalStructure
    usedCapacity += capacity
  valid = validateFormation(...).ok                   # 指挥值上限 + 成员存在性
```

## 六、数据结构（fleetFormation.ts）

```typescript
interface TeamConfigInput {        # 对齐 team_record，编辑器 TeamConfig 结构兼容
  id: string; flagshipUid: string; memberUids: string[];
  formation?: {...}; attrFlags?: number;
}
interface ShipRecordInput {        # 对齐 ship_record，编辑器 ShipRecord 结构兼容
  uid: string; shipId: string; peakLevel?; enhanceLevels?; enabledSlots?; aircrafts?;
}
interface ResolvedFormation {
  teamId; flagshipUid; members: FormationMember[];
  totalFirepower: {antiShip, antiAir, siege}; totalStructure;
  capacity: {used, cap, overflow, overflowBy}; valid;
}
```

平台无关：输入类型为最小结构契约（结构化类型），编辑器无需 import 引擎外类型。

## 七、双轨载机来源

| 路径 | 数据源 | 触发条件 | 对齐 |
|---|---|---|---|
| 模块路径 | `cfg_module_effect` 机库模块 EID∈{2020-2023} | `aircraftsOverride` 为空 | 客户端面板 `get_ship_dps` |
| 玩家覆写 | `ShipRecord.aircrafts: {shipId:[count]}` | `aircraftsOverride` 非空 | 客户端战斗实例 `ShipField.AIRCRAFTS` |

玩家覆写优先（对齐客户端：战斗实例走玩家装备串，面板走模块效果）。codec：
`editor/codec/aircraftsCodec.ts` 实现 `Record<shipId, number[]>` ↔ `"shipId,c1,c2;..."` 串。

## 八、锚点验证（CV3000 / 80201）

```
CV3000 可解析机库（可选系统 8020102/8020108/8020113，需 enabledSlots 启用）：
  module 48023 EID=2022 PARAM=1032005 → ship 10320 (IS-1型-无人机) ×5
  module 48025 EID=2022 PARAM=1033503 → ship 10335 (IT-1型-无人机) ×3
  module 48828 EID=2022 PARAM=1034203 → ship 10342 (LM-1型-战斗无人机) ×3
载机 10320/10335/10342 的 AIRCRAFT_GROUP_NUM=3。

实测：
  载机 10320 单架对舰=450（×group_num 3 已含）
  CV3000 舰载机贡献（启机库）对舰=2250
  CV3000 面板对舰：6500（纯武器）→ 8750（+载机 2250）✓
  玩家覆写 1×10320 = 450 ✓；5×10320 = 2250 ✓
  FG300（无载机）面板不变 ✓（回归保护）
```

## 九、文件清单

引擎数据层（canonical + editor 镜像）：
- `packages/engine/src/data/blueprintCalc.ts` — `computeAircraftDps` + `DRONE_EFFECT_IDS` + `resolveBlueprintPanel` 回填
- `packages/engine/src/data/fleetFormation.ts`（新建）— 编组核心
- `packages/engine/src/data/rawTypes.ts` — `SHIP.EXPLOIT_CAPACITY` + `RawModuleEffect` + `cfgModule`/`systemEffectEnhanceData`/`enhanceValues` 正式化
- `packages/engine/src/data/loader.ts` + `index.ts` — 导出/加载
- `packages/editor/src/engine/data/*` — 镜像同步

加载层：
- `packages/engine/tests/data/nodeUtils.ts` + `packages/editor/src/data/loadStore.ts` — 表名映射 + `cfgModule` 正式化

编辑器：
- `packages/editor/src/data/blueprintSelector.ts` — 指挥值 bug 修 + aircrafts 透传
- `packages/editor/src/data/codec/aircraftsCodec.ts`（新建）+ `codec/index.ts`

测试（28 项新增，全通过）：
- `aircraft-dps-anchor.ts` + `aircraft-dps.test.ts`（10）
- `capacity.test.ts`（11）+ `fleet-formation.test.ts`（7）

测试结果：177 pass / 1 fail（pre-existing panel-comprehensive ST59 抵抗/护盾，与本轮无关）。
