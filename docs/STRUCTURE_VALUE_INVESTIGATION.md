# 结构值联动 —— 探测总结与下一步

> 日期：2026-07-04
> 状态：**遗留待解决**（抵抗/护盾/火力已联动，结构值未联动）

## 一、问题

切换超主力舰的可选模块（如乌拉诺斯之矛的 C2 附加装甲）时：
- ✅ 抵抗值、护盾值、火力 正确联动（已修复）
- ❌ 结构值 不联动（装 C2 后游戏面板 180470→212954，模拟器仍显示 180470）

**C2 附加装甲（weaponId=36052）给舰船结构值加成 32484。** 装上后总结构值 = 180470 + 32484 = 212954。

## 二、已确认的事实

### 数据层面
| 数据源 | 值 | 说明 |
|--------|-----|------|
| `cfg_ship[60501][4]`（HP_MAX 字段） | 180470 | **不含模块加成**的基础结构值 |
| `ShipAttribute.health_max_base` | 180470 | 直接取 `cfg_ship[HP_MAX]`，无计算 |
| 玩家舰船实例 `Tb_ship[uid].hp_max` | 212954 | **含C2加成**，游戏装配时算好存的 |

### C2 模块(36052)属性
- `cfg_module[36052]`：只有描述/名字，**无结构值字段**（14字段全是文本）
- `cfg_module_effect[3605201]`：EID=10 PARAM=1800（战后修复18%，**战斗结算层**，非面板结构值）
- `cfg_ship_system[6050110].HP`：27000（**子系统HP**，战斗中被摧毁的耐久，≠舰船结构值）
- 玩家实例 modules 字段：`1014,36052,27500`（第三列=系统HP，非结构加成）
- 玩家实例 module_effect 字段：`50,-5;5,1301200;10,1800;`（无 32484）

### 全表搜索结果
- **41 张配置表 JSON 精确搜 32484：0 命中**
- **游戏运行时所有 Tb_ 表精确搜 32484：0 命中**
- 32484 **不在任何配置表里**，是运行时计算的

### API 探测结果
| API | 结果 |
|-----|------|
| `ShipAttribute.hp_max` | 运行时报错（需完整游戏环境） |
| `ShipAttribute.health_max_base` | 180470（只取 cfg_ship，不含模块） |
| `BlueprintAttrCalc.get_ship_dps_calc('ship_hp').calculate()` | **0**（`name_2_expressions={}`，结构值无计算表达式） |
| `BlueprintAttrCalc.get_ship_dps_calc('ship_firepower').calculate()` | 26070（火力正常） |
| `get_blueprint_ex_add_values_without_bp_record` | `ship_hp_add=0`（C2 只产生 `ship_system_hp_add=500`） |
| `get_ship_module_effect` | 返回空字符串 |

**根本发现**：`BlueprintAttrCalc`（蓝图属性计算器）只管火力，**结构值没有计算表达式**（`name_2_expressions` 为空）。结构值走的是完全不同的代码路径。

## 三、关键线索（给下一轮）

### 1. 玩家实例 hp_max 是"装配时算好存的"
- `Tb_ship[uid].hp_max = 212954` 是游戏在**装配/卸载模块时**计算并存储的
- 计算逻辑在装配模块的 UI 代码里，不在配置表
- **建议 hook 点**：装配模块时更新 hp_max 的函数（在 `ui.bp_ship_view_facade` 或 `data.ship` 模块里）

### 2. modules 字段格式（已确认）
```
slotIdx,weaponId,systemHP;slotIdx,weaponId,systemHP;...
```
例：`1014,36052,27500;`（C2 附加装甲，slot 1014，系统HP 27500）

### 3. 32484 的数学关系（待验证）
- 32484 = 212954 - 180470
- 32484 / 180470 ≈ 18%
- 32484 / 27000 ≈ 1.203（C2 系统HP 27000）
- 32484 / 27500 ≈ 1.181（含强化的系统HP 27500）
- 不排除是 `cfg_ship_type.ship_hp_add`（战列巡洋舰=5）系数 × 某基础值的计算

### 4. EID=10「舰船结构值提高」定义
`cfg_effect_def[10] = [10, "舰船结构值提高", 4, 2, ...]`
- 第3字段=4，第4字段=2（可能是参数类型标识，影响 PARAM 的解读方式）
- module_effect 里 36052 的 EID=10 PARAM=1800，但 1800 ≠ 32484
- **EID=10 的 PARAM 1800 可能需要乘以某个系数才得到 32484**？(32484/1800≈18.05)

### 5. 最直接的解决方法
**用 frida 批量 dump**：遍历所有超主力舰 + 所有可选模块组合，用游戏算出每种组合的 hp_max，存成 JSON 映射表（类似 company_map.json）。
- 需要玩家拥有这些舰船，或用蓝图编辑器预览模式
- 或者找到装配时算 hp_max 的那个函数，直接调用

### 6. 备选方案（不完美但可用）
如果无法定位公式，可以：
- 只对**玩家已拥有的舰船**从 `Tb_ship.hp_max` 读取真实值
- 或在模拟器里标注"结构值不含模块加成（待实现）"

## 四、已修复的部分（本次提交内容）

### 抵抗/护盾切换联动 ✓
`getBaseDefense`（`blueprintCalc.ts`）正确读取 EID=10033(抵抗)/10021(护盾)，通过 `resolveEnabledSystems` 按切换组互斥过滤装配的装甲模块。

**验证**（乌拉诺斯之矛 60501）：
| 操作 | 抵抗 | 护盾 |
|------|------|------|
| 默认 | 240 | 5% |
| 选附加装甲(C2) | 240 | 5% |
| 切换其他组模块 | 随装甲模块变化 | 随装甲模块变化 |

### 火力切换联动 ✓（上一轮已修复）
`resolveShipWeapons` + `resolveEnabledSystems` + `loadWeaponPriority` 三者配合。

## 五、相关文件
- `packages/engine/src/data/blueprintCalc.ts`：`getBaseDefense`/`resolveBlueprintPanel`（结构值在 454/477 行，待改）
- `packages/engine/src/data/blueprintCalc.ts`：`resolveEnabledSystems`（切换组互斥，已正确）
- `data/client/config/cfg_ship.json`：`[4]` = 基础结构值（不含模块）
