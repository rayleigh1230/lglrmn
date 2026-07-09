# game_data_utils 反编译交接

> 日期：2026-07-09
> 目的：把客户端最后一个黑盒模块 `data_manager.game_data_utils` 完整反编译成可读 Python 源码，消除蓝图系统精确复刻的最后障碍。
> 状态：**已完成（见 docs/20）**——当初判为"工具链缺失"，实为 WSL 服务死锁（机器 2+ 周未重启）；重启系统后本机 WSL 即可完成全流程。1006 文件 93.1% 成功，4 个核心函数全部可读。

---

## 一、为什么要做这件事

蓝图系统的精确复刻卡在 `game_data_utils` 这个编译型模块（`.nxz`）。它包含火力/结构计算的**核心函数**：

| 函数 | 行数 | 作用 |
|---|---|---|
| `calc_effect_add` | 346 | 三通道拆分（ratio_add/num_add/base_num_add）——docs/16 已部分还原 |
| `is_valid_effect` | 375 | 作用域判定（TARGET_SYSTEM/INDEX/MODULE_TYPE）——docs/16 已部分还原 |
| `get_module_attr_value` | 1134 | **模块属性聚合总入口**（attr_type→EID→calculator 分发）——**纯字节码未还原** |
| `get_module_effect_real_value` | 234 | **EID→数值缩放规则**（每个EID的PARAM怎么转有效值）——**纯字节码未还原** |
| `get_after_system_effect_value` | 159 | 系统强化 EnhanceBasic 包装——**纯字节码未还原** |
| `get_module_effect_ori_value_info` | 66 | 模块原值读取（V_SKILL_EFFECT_RATIO 数据源）——**纯字节码未还原** |

完整反编译后，这些函数就和 `blueprint_utils`/`ship_attr_calc` 等 85% 一样变成可读 .py，蓝图系统就能逐函数精确复刻，不再有"纯字节码未还原"的模糊地带。

---

## 二、数据现状（都在本地，无需游戏运行）

| 资产 | 位置 | 说明 |
|---|---|---|
| **game_data_utils 字节码 dump** | `E:\星际猎人\dumped\game_data_utils\` | frida 从游戏进程内存 dump。678 个顶层函数 + 328 个嵌套方法 = **1006 个 .pyc/.marshal.bin/.disasm.txt**。子目录 `data_manager.game_data_utils\` |
| **全量反编译产物（85%）** | `data/client/decompiled-full-v2.zip` | 90162 个 .py，覆盖 scene_zoom0/common/data/ui。**不含 data_manager 包**（当初 walker 的 DISCOVERY_ROOTS 漏了） |
| **game opcode 映射** | `data/client/tools/game_opmap.json` | 游戏混淆的 opcode→标准 mnemonic（95条，confidence 1.0，从90162文件统计） |
| **game cache 映射** | `data/client/tools/game_cachemap.json` | 每个 opcode 的 inline cache 条数（91条） |
| **特殊 opcode** | `data/client/tools/game_special_ops.json` | BINARY_OP arg 重映射等 |
| **翻译脚本** | `data/client/tools/translate_opcodes.py` | game opcode→标准3.11 opcode，重打包 .pyc |
| **pycdc 补丁** | `data/client/tools/patch_pycdc.py` | 给 pycdc 的 ASTree.cpp 打 Python 3.11 opcode 补丁 |
| **批量反编译脚本** | `data/client/tools/batch_decompile_v2.py` | 调用 pycdc 批量反编译（原设计WSL环境） |
| **dump 脚本** | `data/client/tools/dump_game_data_utils.py` | 当初 frida dump 用的脚本（已dump完，不用重跑） |

---

## 三、完整流程（明天在其他机器执行）

### 前提：目标机器有 WSL Ubuntu（或 Linux）+ pycdc 源码

当初 85% 全量反编译就是这套：WSL 里 `~/pycdc/build/pycdc`。如果那台机器还保留着，直接跳到步骤3。

### 步骤1：确保 pycdc 已构建（带 Python 3.11 补丁）

```bash
# WSL 里
cd ~
git clone https://github.com/zrax/pycdc.git   # 如果没有
cd pycdc
# 应用 3.11 补丁（Windows 侧的 patch_pycdc.py 改的是 ~/pycdc/ASTree.cpp）
# patch_pycdc.py 路径写的是 Path.home()/"pycdc"/"ASTree.cpp"，在 WSL 里就是 ~/pycdc/ASTree.cpp
python3 /mnt/e/战斗模拟器/data/client/tools/patch_pycdc.py
cmake . && make -j$(nproc)
# 验证
~/pycdc/build/pycdc --help
```

### 步骤2：翻译 game opcode → 标准 3.11（translate_opcodes）

把 game_data_utils 的 `.marshal.bin` 翻译成标准 3.11 的 `.pyc`。

```bash
cd /mnt/e/战斗模拟器/data/client/tools
# ★注意：translate_opcodes.py 的 main() 用 multiprocessing.Pool，
#   Windows 下 spawn 不继承全局 → 1006 文件全失败（files_failed）。
#   Linux 下 fork 继承全局 → 应该正常。若仍失败，用下面的单进程版。
IN_DIR="/mnt/e/星际猎人/dumped/game_data_utils" \
OUT_DIR="/mnt/e/战斗模拟器/dumped/gdu_translated" \
python3 translate_opcodes.py
```

**已验证**：单文件翻译正确（calc_effect_add: 278 ops translated, 0 unknown，输出 magic `a70d0d0a` 标准3.11）。本机已翻译 26 个顶层文件到 `E:\战斗模拟器\dumped\gdu_translated\`。

**若 Pool 失败，用单进程版**（本机验证可用，只是慢——5分钟26文件，因 marshal walker 遇嵌套类型走 fallback）：
```python
# 单进程版关键代码（已在本机验证逻辑正确）
import importlib.util
from pathlib import Path
spec = importlib.util.spec_from_file_location("to", "translate_opcodes.py")
to = importlib.util.module_from_spec(spec); spec.loader.exec_module(to)
g2s, gcache, binop = to.load_mappings()
for f in Path(r'E:\星际猎人\dumped\game_data_utils').rglob('*.marshal.bin'):
    rel = f.relative_to(IN); out_pyc = OUT/rel.parent/(rel.name[:-len('.marshal.bin')]+'.pyc')
    out_pyc.parent.mkdir(parents=True, exist_ok=True)
    pyc, nc, no, nu = to.translate_one(f.read_bytes(), g2s, gcache, binop)
    out_pyc.write_bytes(pyc)
```

**已知问题**：marshal walker 遇到嵌套 code object / TYPE_REF 等会刷 `unknown marshal type 0xXX` 警告并逐字节 copy rest。这导致：(1) 慢；(2) 嵌套函数翻译可能不全。**待修**：给 walker 补全嵌套 code object 的递归翻译（`_walk_code` 已存在，但嵌套的 TYPE_REF/TYPE_SHORT_ASCII_INTERNED 等可能没覆盖全）。

### 步骤3：pycdc 批量反编译

```bash
# WSL 里（复用 batch_decompile_v2.py，改环境变量指向 gdu_translated）
IN_PYC_DIR="/mnt/e/战斗模拟器/dumped/gdu_translated" \
OUT_PY_DIR="/mnt/e/战斗模拟器/data/client/decompiled_gdu" \
PYCDC="$HOME/pycdc/build/pycdc" \
python3 /mnt/e/战斗模拟器/data/client/tools/batch_decompile_v2.py
```

输出到 `data/client/decompiled_gdu/data_manager.game_data_utils/`。

### 步骤4：验收

```bash
# 核心函数应输出可读 Python（不再是 disasm 字节码）
cat /mnt/e/战斗模拟器/data/client/decompiled_gdu/data_manager.game_data_utils/calc_effect_add.py
cat /mnt/e/战斗模拟器/data/client/decompiled_gdu/data_manager.game_data_utils/get_module_attr_value.py
# 统计成功率（对照 decompiled-full-v2 的 ~91% 成功率基准）
find /mnt/e/战斗模拟器/data/client/decompiled_gdu -name "*.py" | wc -l   # 应≈1006
grep -rl "Decompyle incomplete" /mnt/e/战斗模拟器/data/client/decompiled_gdu | wc -l  # 失败数
```

### 步骤5：反编译产物入 git + 对齐模拟器

- `data/client/decompiled_gdu/` 入 git（参考 `decompiled-full-v2.zip` 的处理方式）
- 用反编译出的源码替换模拟器里所有"纯字节码未还原"的实现（见 docs/17 缺陷清单 + 本文档第一节那4个核心函数）

---

## 四、本机尝试记录（为什么没完成）

1. **C盘清理**：成功释放 10G（677M→11G可用）。清了 frida临时(8.1G)/钉钉更新包(728M)/360解压临时(389M)/IDE缓存(328M)等。
2. **translate 单文件验证**：成功。calc_effect_add 翻译正确（278 ops, 0 unknown, 标准3.11 magic）。
3. **translate 批量**：卡住。multiprocessing.Pool 在 Windows spawn 下不继承全局变量 → 1006文件全 files_failed。改单进程能跑但慢（marshal walker 嵌套类型 fallback）。
4. **工具链重装**：失败。本机无 WSL 发行版、无 C++编译器、无 cmake。winget 装 WinLibs 下载超时（网络~35KB/s）。CMake 直链下载也超时（46MB要22分钟）。
5. **pycdc**：未构建（缺编译器）。

结论：本机网络+工具链条件不支持当天完成，换已装工具链的机器是正解。

---

## 五、分支状态

分支 `feat/blueprint-client-alignment`，已有 6 个提交（蓝图对齐工作，已验证）：
- 调校 SYSTEM_ADJUST_IN_ENHANCE 重写
- 巅峰变体归一化
- 结构分层 get_ship_hp 重构
- 火力取整 + V_SKILL_EFFECT_RATIO 双绑
- docs/17 对齐总账

本次反编译尝试**未产生新提交**（无完成的代码改动）。本文件(docs/19)是唯一新增产物。

`E:\战斗模拟器\dumped\gdu_translated\` 是本次翻译的 26 个产物（未入 git，可删可留——明天在正确机器上会重新全量翻译）。
