"""阶段0-B解析器：从 probe_v1_raw.json 还原 marshal，跑完整 dis.dis。

输入：E:\\星际猎人\\probe_v1_raw.json （探针写入的 JSON 数组）
输出：
  - data/client/analysis/get_ship_dps_calc.disasm.txt  完整反汇编
  - data/client/analysis/get_ship_dps_calc.pyc         最小 .pyc（供后续 pycdc 用）
  - stdout 打印公式骨架摘要（嵌套闭包 + 常量）
"""
import json, marshal, dis, base64, io, os, sys, importlib.util

RAW = r"E:\星际猎人\probe_v1_raw.json"
ANALYSIS_DIR = r"E:\战斗模拟器\data\client\analysis"
OUT_DISASM = os.path.join(ANALYSIS_DIR, "get_ship_dps_calc.disasm.txt")
OUT_PYC = os.path.join(ANALYSIS_DIR, "get_ship_dps_calc.pyc")

if not os.path.exists(RAW):
    print("NO_RAW:", RAW); sys.exit(1)

with open(RAW, "r", encoding="utf-8") as f:
    arr = json.loads(f.read())

# 抽关键字段（raw 可能有两层：外层 list，PYRESULT 又是 JSON 字符串数组）
flat = []
for line in arr:
    if line.startswith("PYRESULT="):
        try:
            inner = json.loads(line[len("PYRESULT="):])
            flat.extend(inner)
        except Exception:
            flat.append(line)
    else:
        flat.append(line)

marshal_b64 = None
meta = []
nested = []
for line in flat:
    if line.startswith("MARSHAL_B64="):
        marshal_b64 = line[len("MARSHAL_B64="):]
    elif line.startswith("NESTED "):
        nested.append(line[len("NESTED "):])
    elif line.startswith("CONST ") or line.startswith("CALC_CONSTANT=") or line.startswith("ROOT_") or line.startswith("MARSHAL_LEN="):
        meta.append(line)

if not marshal_b64:
    print("NO MARSHAL_B64 in raw. Full content:")
    for l in arr[:20]: print("  " + l[:200])
    sys.exit(1)

blob = base64.b64decode(marshal_b64)
print("MARSHAL bytes =", len(blob))
co = marshal.loads(blob)
print("RESTORED code object: name=", co.co_name, "argcount=", co.co_argcount,
      "firstlineno=", getattr(co, 'co_firstlineno', '?'))

# 1. 完整反汇编到文件
buf = io.StringIO()
buf.write("# Restored from data.ship_attr_calc.BlueprintAttrCalc.get_ship_dps_calc\n")
buf.write("# Source file ref: data/ship_attr_calc.py (line " + str(getattr(co,'co_firstlineno','?')) + ")\n")
buf.write("# argcount=" + str(co.co_argcount) + "\n")
buf.write("# co_names=" + json.dumps(list(co.co_names)) + "\n")
buf.write("# co_varnames=" + json.dumps(list(co.co_varnames)) + "\n")
buf.write("\n")
dis.dis(co, file=buf)
os.makedirs(ANALYSIS_DIR, exist_ok=True)
with open(OUT_DISASM, "w", encoding="utf-8") as f:
    f.write(buf.getvalue())
print("DISASM WRITTEN:", OUT_DISASM, "len=", len(buf.getvalue()))

# 2. 写最小 .pyc（pycdc 需要）
#    .pyc header: magic(4) + flags(4) + mtime(4) + size(4) = 16 bytes，然后 marshal
magic = importlib.util.MAGIC_NUMBER  # 3.11 = a70d0d0a
header = magic + b"\x00\x00\x00\x00" + b"\x00\x00\x00\x00" + b"\x00\x00\x00\x00"
with open(OUT_PYC, "wb") as f:
    f.write(header + blob)
print("PYC WRITTEN:", OUT_PYC)

# 3. 打印嵌套闭包摘要
print("\n=== NESTED CODE OBJECTS (公式里的内嵌函数) ===")
for n in nested:
    print("  " + n)

# 4. 打印模块常量（这些可能直接就是公式系数）
print("\n=== MODULE CONSTANTS / CALCULATION_CONSTANT ===")
for m in meta:
    print("  " + m[:400])

# 5. 给一个"人工读公式"的提示
print("\n=== 怎么读这份反汇编 ===")
print("打开", OUT_DISASM)
print("找 LOAD_ATTR / LOAD_CONST / BINARY_OP / RETURN_VALUE 序列，")
print("配合 co_names（属性名）和 co_consts（常量），就能还原公式。")
print("嵌套 code object 是 closure（如 _add_new_calc），按 NESTED 列表里的 name 在反汇编里搜 <code ...>。")
