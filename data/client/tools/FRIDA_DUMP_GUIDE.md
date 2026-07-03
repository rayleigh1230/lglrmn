# Frida Dump 操作手册

> 目标：从游戏客户端内存读取战报、配置表、模块结构等数据
> 原理：frida注入游戏进程 → 在游戏Python解释器里执行代码 → 读取/解码数据

---

## 一、环境准备（一次性）

### 1.1 安装frida
```bash
python -m pip install frida frida-tools
```
验证：`python -c "import frida; print(frida.__version__)"` → 应输出17.x

### 1.2 关键坑点：frida 17 API变更
| 旧API(失效) | 新API(frida 17) |
|---|---|
| `Module.findExportByName(...)` | `Process.getModuleByName("dll").getExportByName(...)` |
| `Module.findBaseAddress(...)` | `Process.getModuleByName("dll").base` |
| `rpc.exports` + `exports_sync` | 用 `send()` 回传结果（避开RPC版本差异） |

### 1.3 工具脚本位置

> **⚠️ 路径适配（2026-07-02）**：
> 本机环境：游戏客户端在 `D:\无尽的拉格朗日\`，代码仓库在 `F:\战斗模拟器\lglrmn\`。
> 工具脚本已统一放入仓库 `F:\战斗模拟器\lglrmn\data\client\tools\`。
> `dump_bull_bid.py` 的 OUTDIR 已改为直接输出到仓库 `data\client\battle_report_today2\`（dump 完即可用，无需再拷贝）。
> 每次按 BID dump 前需修改脚本顶部的 `BID` 和 `OUTDIR`。

工具脚本（在 `F:\战斗模拟器\lglrmn\data\client\tools\`）：
- `inject_probe3.py` — 基础注入验证（验证通道可用）
- `batch_dump3.py` + `_dump_logic.py` — 批量dump模块结构
- `dump_all_blueprint.py` — 批量dump配置表
- `dump_bull_bid.py` — 按battle_id dump指定战报（改 BID + OUTDIR 后用）
- `list_reports.py` — 列出最近战报+摘要（查 BID 用，无路径依赖）

**frida 环境**：本机用 `py`（Python 3.13 Launcher），`py -m pip install frida frida-tools` 已装好。
**游戏进程名**：`infinite_lagrange_cn.exe`。

---

## 二、注入流程（每次dump）

### 2.1 启动游戏
1. 启动 `D:\无尽的拉格朗日\launch.exe` 或 `infinite_lagrange_cn.exe`
2. **登录到主界面**（确保Python解释器已初始化）

### 2.2 执行dump（需管理员权限）
frida attach游戏进程需要管理员权限。用以下方式提权：

**方法：UAC提权wrapper**
```python
# _probe_wrapper.py（已存在）
import subprocess, sys
OUT = r"D:\无尽的拉格朗日\probe_result.txt"
with open(OUT, "w", encoding="utf-8") as f:
    subprocess.run([sys.executable, r"D:\无尽的拉格朗日\<脚本>.py"],
                   stdout=f, stderr=subprocess.STDOUT, timeout=55)
```
```bash
# 命令行执行（触发UAC弹窗，点"是"）
powershell -Command "Start-Process -FilePath 'pythonw.exe' -ArgumentList 'D:\无尽的拉格朗日\_probe_wrapper.py' -Verb RunAs"
```

### 2.3 读取结果
```bash
cat "D:\无尽的拉格朗日\probe_result.txt"
```

---

## 三、各任务的操作步骤

### 3.1 验证注入通道
```bash
# 修改_probe_wrapper.py指向inject_probe3.py
# 执行UAC提权
powershell -Command "Start-Process -FilePath 'pythonw.exe' -ArgumentList 'D:\无尽的拉格朗日\_probe_wrapper.py' -Verb RunAs"
# 等待15秒后读结果
cat "D:\无尽的拉格朗日\probe_result.txt"
```
成功标志：`PyRun_SimpleString rc=0` + 能看到nxio3模块信息

### 3.2 Dump战报HP曲线（最常用）

**前提：必须在游戏里打开目标战报详情**（否则数据不在内存）

```bash
# 1. 游戏里打开战报列表 → 点开目标战报详情
# 2. 修改dump脚本的TARGET_BID（或用list_reports.py先列出所有战报ID）
# 3. 执行dump
```

**列出所有战报**：运行 `list_reports.py`，输出所有REPORT_DETAIL的battle_id+时长+名称

**Dump指定战报**：修改 `dump_bull_bid.py` 里的 `BID=190241382543560`，执行

**解码**（dump脚本已内置，但手动解码方法）：
```python
import base64, zlib
raw = open('enemy_battle_data.txt').read()
decoded = base64.b64decode(raw)
plaintext = zlib.decompress(decoded[4:]).decode('utf-8')
# plaintext是JSON，含HP曲线
```

### 3.3 Dump配置表
```bash
# 直接执行（不需要打开任何界面，配置表启动时就加载）
# 修改_probe_wrapper.py指向dump_all_blueprint.py
powershell -Command "Start-Process -FilePath 'pythonw.exe' -ArgumentList 'D:\无尽的拉格朗日\_probe_wrapper.py' -Verb RunAs"
```
输出到 `D:\无尽的拉格朗日\dumped\cfg_*.json`（10张表，~14000条记录）

### 3.4 Dump模块结构
```bash
# 修改_probe_wrapper.py指向batch_dump3.py
# 修改_dump_logic.py里的GROUPS字典指定要dump的模块
```
输出到 `D:\无尽的拉格朗日\dumped\*.txt`

---

## 四、核心JS注入模板（写新脚本时参考）

所有dump脚本的JS部分结构相同，核心模板：

```javascript
var py = Process.getModuleByName("python311.dll");
var f = function(n){ return py.getExportByName(n); };
var Ens = new NativeFunction(f("PyGILState_Ensure"), 'pointer', []);
var Rel = new NativeFunction(f("PyGILState_Release"), 'void', ['pointer']);
var Run = new NativeFunction(f("PyRun_SimpleString"), 'int', ['pointer']);
var AddM = new NativeFunction(f("PyImport_AddModule"), 'pointer', ['pointer']);
var GetA = new NativeFunction(f("PyObject_GetAttrString"), 'pointer', ['pointer', 'pointer']);
var Str = new NativeFunction(f("PyObject_Str"), 'pointer', ['pointer']);
var UTF8 = new NativeFunction(f("PyUnicode_AsUTF8"), 'pointer', ['pointer']);

// Python代码（在游戏解释器里执行）
var pyCode = [
    "import sys, json",
    "out = []",
    "out.append('hello from game python')",
    // ... 你的逻辑 ...
    "_PROBE_OUT = json.dumps(out)"
].join("\n");

var code = Memory.allocUtf8String(pyCode);
var gil = Ens();
var rc = Run(code);  // 执行Python代码
// 读回结果
if (rc == 0) {
    var mod = AddM(Memory.allocUtf8String("__main__"));
    var v = GetA(mod, Memory.allocUtf8String("_PROBE_OUT"));
    if (!v.isNull()) {
        var st = Str(v);
        var cs = UTF8(st);
        if (!cs.isNull()) {
            // send回传给Python侧
            send("RESULT=" + cs.readUtf8String());
        }
    }
}
Rel(gil);
```

**关键点**：
1. Python代码里把结果存到全局变量 `_PROBE_OUT`（JSON字符串）
2. JS侧通过 `PyImport_AddModule("__main__")` + `PyObject_GetAttrString` 读回
3. 路径中的反斜杠在JS里要写 `\\`（如 `D:\\无尽的拉格朗日\\dumped`）
4. Python代码不能有JS模板字符串的 `` ` `` 和 `${}` 冲突

---

## 五、战报数据详解（分析时参考）

### 5.1 HP曲线解析
```python
# 解码后的JSON结构
data = {"team_id": [块0, 块1, 块2]}
# 块0: 舰队配置
# 块1: HP曲线字符串
# 块2: 舰船详细+攻击事件

# HP曲线字符串解析
hp_str = "5,0,370192,186208#5,5,370192,186208#..."
for sample in hp_str.split('#'):
    p = sample.split(',')
    # p[0]=type(5=采样,97=击毁,99=team)
    # p[1]=time(秒)
    # p[2]=受击方结构值
    # p[3]=攻击方总结构值
```

### 5.2 命中率反推公式
```
命中发数 = 武器伤害 / perHit
总开火数 = N艘 × 发/周期 × 周期数k
周期数k: 击毁时刻 = T0 + 锁定 + (k-1)×CD
命中率 p = 命中发数 / 总开火数
base = p / (1 + k_bonus - dodge)
```

### 5.3 时间参数（实测值）
```
后摇 = 战报时长 - 击毁时刻(type=97) = 1秒
前摇T0 ≈ 7秒（混沌，主副交叉验证）
首发时刻 = T0 + 锁定时间
```

---

## 六、常见问题

### Q: attach被拒（权限不足）
A: 必须用 `-Verb RunAs` 提权（UAC弹窗点"是"）

### Q: PyRun_SimpleString 返回 -1
A: Python代码有语法错误。检查：
- 路径反斜杠是否在JS里正确转义（`\\`）
- 是否有JS模板字符串冲突字符
- 用 `exec(open(file).read())` 方式执行外部.py文件可避免转义问题

### Q: REPORT_DETAIL 为空
A: 必须先在游戏里**点开战报详情**，数据才会从服务器加载到内存

### Q: 游戏崩溃/异常
A: frida注入可能干扰游戏。重启游戏，减少注入频率

### Q: 战报数据看起来不对
A: 检查battle_id是否正确（用list_reports.py列出全部）。REPORT_DETAIL可能累积多条，`next(iter())`取的不是最新的
