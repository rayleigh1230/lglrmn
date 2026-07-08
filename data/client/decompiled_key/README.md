# 关键反编译源码（精简版）

从 `infinite_lagrange_cn.exe`（CPython 3.11）反编译出的 90162 个 Python 文件中，筛选出**战斗计算直接相关**的 231 个核心文件。

## 为什么只挑这些

完整反编译产物 41.8 MB（90162 个 .py 文件），其中绝大部分是 UI 代码、调试渲染、配置加载等与战斗计算无关的内容。本目录只保留**未来查证战斗公式或字段含义时真正会翻的类**。

完整反编译产物通过 GitHub Release 分发（见仓库 Release 页 `decompiled-full-v2.zip`）。

## 模块清单（231 文件，按功能分组）

### 战斗公式计算器（4 类，`data/ship_attr_calc/`）
- **AttackCalculator** — 基础攻击力公式（对应 `blueprintCalc.ts` 的 effectiveDph）
- **DPSCalculator** — DPS 聚合器
- **EnhanceCalculator** — 强化效果公式
- **AfterSystemEffectCalculator** — 系统效果后公式

### 强化计算引擎（12 类，`data/enhance_calc/`）
- **CalculationExpression** — 加权表达式求值
- **ParsedEnhanceDesc** — 强化项描述解析
- **EnhanceCalculator** — 强化聚合主类
- 其他：CalculatableData / CalculationConstant / DiffData / LazyCalculatable / named_diff

### 舰船/编队数据结构（3 类）
- **data/ship/ship_data_base/ShipDataBase** — 舰船基类（含 module_info_dict/effects_enhanced_str 等）
- **data/ship/client_battle_ship_data/ClientBattleShipData** — 战斗态舰船
- **data/blueprint/blueprint_data/BlueprintData** — 蓝图数据

### 协议定义（5 类，`common/config/network/protocol/`）
- **CreateTeamReq** — 组队请求 payload
- **EvaVirtualCreateTeam** — 评估战斗虚拟组队（唯一可塞构造数据的入口）
- **GetTeamData** — 拉取团队数据
- **UserGetBattleReport** — 拉取战报
- **BattleDataUpdate** — 战斗数据推送

### 虚拟编队工具（1 类）
- **common/virtual_team_utils/BaseStratege** — 虚拟编队策略基类

## 字段映射参考

模拟器 ShipRecord / TeamConfig 字段与客户端 ShipField / TeamField 的对照见：
- `docs/HANDOVER-20260708.md` 第四节
- `docs/15-客户端公式反编译专题.md`

## 反编译方法

完整反编译过程（三层反逆向突破、翻译器、pycdc patch）见：
- `docs/15-客户端公式反编译专题.md`
- `data/client/tools/` — 反编译工具链
- `data/client/tools/game_opmap.json` / `game_cachemap.json` / `game_special_ops.json` — 映射表

## 如何阅读这些文件

每个 .py 文件顶部会标注：
```python
# Source Generated with Decompyle++
# File: xxx.pyc (Python 3.11)
```

注意：
- 部分文件结尾可能有 `# WARNING: Decompyle incomplete`，表示 pycdc 没完全还原
- 闭包/嵌套函数会在路径里带 `._nested_` 或 `._nested_._nested_`
- property getter 在路径里带 `._property_`
