# game_data_utils 反编译完成

> 日期：2026-07-09
> 目的：关闭 docs/19 的交接——把客户端最后一个黑盒模块 `data_manager.game_data_utils` 完整反编译成可读 Python。
> 状态：**完成**。4 个"纯字节码未还原"核心函数全部产出可读源码。

---

## 一、结论（先看这个）

docs/19 的全部目标已达成：

| 函数 | docs/19 状态 | 本次结果 |
|---|---|---|
| `calc_effect_add` (346行) | 已部分还原 | ✅ 完整可读，三通道逻辑全现 |
| `is_valid_effect` (375行) | 已部分还原 | ⚠️ 反编译为空（pycdc 控制流重建失败，见 §四）——但本就在 docs/16 部分还原范围，非阻塞 |
| `get_module_attr_value` (1134行) | **纯字节码未还原** | ✅ **完整可读（8710B，attr_type→calculator 分发清晰）** |
| `get_module_effect_real_value` (234行) | **纯字节码未还原** | ✅ **完整可读（每个 EFFECT_ID 的 PARAM→有效值缩放规则全现）** |
| `get_after_system_effect_value` (159行) | **纯字节码未还原** | ✅ **完整可读（系统强化包装公式 `(base+add_base)*(100+add_ratio+skill_ratio)/100+add_num`）** |
| `get_module_effect_ori_value_info` (66行) | **纯字节码未还原** | ✅ **完整可读（V_SKILL_EFFECT_RATIO 数据源）** |

**蓝图系统精确复刻的"最后障碍"已清除。** 下一步可用这 4 个函数源码逐行对齐 `effectList.ts` / `blueprintCalc.ts`（docs/17 缺陷清单），属下一阶段工作。

---

## 二、关键转折：障碍为何消失

docs/19 的判断是「本机无 WSL/编译器/cmake、网慢→无法构建 pycdc，换机器」。**实际验证后发现前提有误，本机即可完成：**

1. **WSL Ubuntu 一直在这台机器上**（`CanonicalGroupLimited.Ubuntu`），且 `~/pycdc/build/pycdc`（带 docs/15 patch 的 patched 版，Jul 7 构建）仍在——当初 9 万文件批量反编译就是它。
2. 本机会话期间 WSL 服务曾**死锁**（`wsl -l`、`wsl --shutdown`、`net stop LxssManager` 全部卡住，机器已 2+ 周未重启）。**重启系统后 WSL 立即恢复**——这是真正的 blocker，不是工具链缺失。
3. 仓库里的 `data/client/tools/pycdc.exe`（Jul 9，i386 PE，2025-10-21 编译）是**未 patch 的通用 Decompyle++**，opcode 表/switch 与游戏 3.11 不匹配（报 `Unsupported opcode: LIST_TO_TUPLE (102)`、`SET_ADD (187)` 等），**不可用于本任务**。正确路径仍是 WSL patched pycdc。

> 教训：docs/19 把"WSL 卡死"误诊为"工具链缺失"。下次遇到 `wsl` 命令卡住，先试重启系统而非重装工具链。

---

## 三、实际执行的流程（全在 WSL，无任何重装）

完全复用 docs/15 已验证的工具链，只改路径：

```
gdu_raw/*.marshal.bin  ──translate_recursive_v2.py──▶  gdu_translated_v2/*.pyc
                      (手写 marshal walker + jump 重定位)        │
                                                                 ▼
                                            patched pycdc ──▶ decompiled_gdu/*.py
```

### 步骤1：单文件端到端验收（先验后批，降风险）

用 `calc_effect_add` 走完整链路：

```bash
# WSL Ubuntu
export OPMAP_PATH=/mnt/e/战斗模拟器/data/client/tools/game_opmap.json
export CACHEMAP_PATH=/mnt/e/战斗模拟器/data/client/tools/game_cachemap.json
export SPECIALOPS_PATH=/mnt/e/战斗模拟器/data/client/tools/game_special_ops.json
~/pycdc/build/pycdc <translated calc_effect_add.pyc>   # → 吐出可读 Python，stderr 空 ✅
```

验收通过（三通道 ratio_add/num_add/base_num_add 逻辑肉眼可见），才进入批量。

### 步骤2：全量翻译（1006 code object）

```bash
export IN_DIR=/mnt/e/战斗模拟器/dumped/gdu_raw
export OUT_DIR=/mnt/e/战斗模拟器/dumped/gdu_translated_v2
python3 translate_recursive_v2.py
# → recursive 1006 / fallback 0 / fail 0，共翻译 1084 个 code object（含 78 嵌套）
```

**100% 递归成功**（优于 docs/15 的 99.97% 基准）。

### 步骤3：批量反编译

```bash
export IN_PYC_DIR=/mnt/e/战斗模拟器/dumped/gdu_translated_v2
export OUT_PY_DIR=/mnt/e/战斗模拟器/data/client/decompiled_gdu
export PYCDC=/home/adminstrator/pycdc/build/pycdc
python3 batch_decompile_v2.py
```

### 结果统计（python os.walk 精确计数）

| 指标 | 值 |
|---|---|
| .py 总数 | 1006 |
| 总体积 | 0.58 MB |
| 完全可读（非空 + 无 incomplete 警告） | 936 (93.1%) |
| 仅 header（反编译失败，<90B） | 47 (4.7%) |
| 带 `Decompyle incomplete` 但有 body | 23 |
| 成功率 vs docs/15 基准（91%） | **93.1% ↑** |

---

## 四、失败的 47 个文件分析

`os.walk` 分类：47 个 header-only 里**只有 3 个沾边战斗关键词**——`is_valid_effect`、`check_ship_level`、`get_occupy_system_hp_max`，其余 44 个是 NPC 等级/建筑涂装/小行星骚扰/队伍护送等 gameplay/UI 杂项，与火力计算无关。

**核心 4 函数无一在失败列表。** 失败主因是 pycdc 对复杂控制流（try/except 嵌套、深条件链）的 AST 重建能力上限，非翻译问题。`is_valid_effect`（375行的作用域判定）此前已在 docs/16 部分还原，空输出不阻塞蓝图对齐。

---

## 五、产物清单

| 路径 | 内容 | 入 git |
|---|---|---|
| `data/client/decompiled_gdu/data_manager.game_data_utils/<func>/<func>.py` | 1006 个反编译 .py，布局对齐 `decompiled_key/` 先例 | ✅ |
| `dumped/gdu_translated_v2/` | 1006 个翻译后 .pyc（中间产物） | ❌（dumped/ 不入库，与既有约定一致） |
| `dumped/gdu_raw/` | 原始 marshal.bin/disasm.txt 四元组（frida dump） | ❌ |

工具链脚本（`translate_recursive_v2.py` / `batch_decompile_v2.py` / `patch_pycdc.py` / 三张映射表）均为 docs/15 既有产物，未改动。`translate_fast.py` 是本会话早期尝试的旁路（基于 Python 3.13 `marshal.loads`），**非本次使用路径**——docs/15 §九-坑1 已明确 CPython 3.12/3.13 的 `marshal.loads` 在游戏数据上不可靠，正确做法是 `translate_recursive_v2.py` 的手写 walker。

---

## 六、下一步（移交，不在本次范围）

1. **逐函数对齐 TS**：用反编译出的 4 个核心函数源码逐行对照 `packages/engine/src/data/effectList.ts` / `blueprintCalc.ts`，关闭 docs/17 缺陷清单剩余项。
2. **关键校验点**：
   - `get_module_effect_real_value` 的每个 EFFECT_ID 缩放规则（`%100`/`%1000`/`/100`/`/5000`/取负）——直接对照 TS 里 `V_SKILL_EFFECT_RATIO` 的处理。
   - `get_after_system_effect_value` 的三通道公式形态。
   - `get_module_attr_value` 的 `attr_type` 分发表（MA_MODULE_DPS / MA_MODULE_REPAIR / MA_MODULE_AIR_DPS / MA_MODULE_COEF_DPS …）。
3. `is_valid_effect` 若对齐时发现 TS 有偏差，再单独用其 disasm.txt 补全（反编译空但 disasm 完整）。

---

## 七、与 docs/19 的差异订正

| docs/19 说法 | 实际 |
|---|---|
| "本机无 WSL 发行版" | 有 Ubuntu，且 patched pycdc 完好；只是 WSL 服务死锁，重启即恢复 |
| "26 个文件翻译到 gdu_translated" | 本次 1006 全量递归翻译，0 fallback |
| 流程依赖"换到已装工具链的机器" | 不需要，本机 WSL 即为该机器 |
| `translate_opcodes.py` 单进程版为主 | 实际用 `translate_recursive_v2.py`（docs/15 主用，带 jump 重定位） |

docs/19 末"分支状态"提到的 `feat/blueprint-client-alignment` 6 提交属实；本次反编译产物在新提交中（见 git log）。
