"""从 disasm.txt 推算 BINARY_OP / COMPARE_OP / IS_OP / CONTAINS_OP 等"带 arg 子类型"指令的 arg 重映射。

格式样例：
    BINARY_OP               26 (/)
    COMPARE_OP              2 (==)
    IS_OP                   0
    CONTAINS_OP             0
    CONTAINS_OP             1

BINARY_OP 和 COMPARE_OP 后面会有括号包裹的操作符符号，能直接对应到标准 3.11 值。
"""
import re, json, os, sys
from pathlib import Path
from collections import defaultdict

DUMP_DIR = Path(os.environ.get("DUMP_DIR", r"E:\星际猎人\dumped\modules_all"))
OUT = Path(os.environ.get("OUT_SPECIALOPS", r"E:\战斗模拟器\data\client\tools\game_special_ops.json"))

# 匹配 `MNEMONIC    arg (symbol)` 形式
BINOP_RE = re.compile(r"\bBINARY_OP\s+(\d+)\s+\(([^)]+)\)")
CMPOP_RE = re.compile(r"\bCOMPARE_OP\s+(\d+)\s+\(([^)]+)\)")

# 标准 Python 3.11 的 BINARY_OP 子操作符映射（symbol -> NB_* 值）
# 来自 cpython/Include/pycore_opcode.h 中的 _nb_ops 数组
STD_311_BINOP_SYMBOL_TO_VAL = {
    "+": 0,   # NB_ADD
    "&": 1,   # NB_AND
    "//": 2,  # NB_FLOOR_DIVIDE
    "<<": 3,  # NB_LSHIFT
    "@": 4,   # NB_MATMUL
    "*": 5,   # NB_MULTIPLY
    "%": 6,   # NB_REMAINDER
    "|": 7,   # NB_OR
    "**": 8,  # NB_POWER
    ">>": 9,  # NB_RSHIFT
    "-": 10,  # NB_SUBTRACT
    "/": 11,  # NB_TRUE_DIVIDE
    "^": 12,  # NB_XOR
    "+=": 13, # NB_INPLACE_ADD
    "&=": 14, # NB_INPLACE_AND
    "//=": 15, # NB_INPLACE_FLOOR_DIVIDE
    "<<=": 16, # NB_INPLACE_LSHIFT
    "@=": 17, # NB_INPLACE_MATMUL
    "*=": 18, # NB_INPLACE_MULTIPLY
    "%=": 19, # NB_INPLACE_REMAINDER
    "|=": 20, # NB_INPLACE_OR
    "**=": 21, # NB_INPLACE_POWER
    ">>=": 22, # NB_INPLACE_RSHIFT
    "-=": 23, # NB_INPLACE_SUBTRACT
    "/=": 24, # NB_INPLACE_TRUE_DIVIDE
    "^=": 25, # NB_INPLACE_XOR
}

# 标准 Python 3.11 COMPARE_OP 子操作符（值来自 Python 3.11 dis 模块）
# 实际上 COMPARE_OP arg 在 3.11 中 arg << 4 | cmp_type，但 disasm 显示的是 cmp_type
# cmp_type: 0 (<), 1 (<=), 2 (==), 3 (!=), 4 (>), 5 (>=)
STD_311_CMPOP_SYMBOL_TO_VAL = {
    "<": 0, "<=": 1, "==": 2, "!=": 3, ">": 4, ">=": 5,
}


def main():
    binop_counts = defaultdict(lambda: defaultdict(int))  # symbol -> {game_arg: count}
    cmpop_counts = defaultdict(lambda: defaultdict(int))
    files = 0

    for disasm_path in DUMP_DIR.rglob("*.disasm.txt"):
        try:
            text = disasm_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        cut = text.find("Disassembly of <code object")
        if cut >= 0:
            text = text[:cut]

        for m in BINOP_RE.finditer(text):
            arg = int(m.group(1)); sym = m.group(2).strip()
            binop_counts[sym][arg] += 1
        for m in CMPOP_RE.finditer(text):
            arg = int(m.group(1)); sym = m.group(2).strip()
            cmpop_counts[sym][arg] += 1

        files += 1

    print(f"Total: {files} files", file=sys.stderr)

    # 推算 BINARY_OP：每个 symbol 取众数 game_arg
    binop_map = {}  # game_arg -> std_val
    print(f"\n=== BINARY_OP remap ===", file=sys.stderr)
    for sym, counts in binop_counts.items():
        top_arg, top_cnt = max(counts.items(), key=lambda kv: kv[1])
        total = sum(counts.values())
        conf = top_cnt / total
        std_val = STD_311_BINOP_SYMBOL_TO_VAL.get(sym)
        marker = "✓" if std_val is not None else "?"
        if std_val is not None:
            binop_map[top_arg] = {"std_val": std_val, "symbol": sym, "count": top_cnt, "total": total, "confidence": round(conf, 4)}
        print(f"  sym={sym:5s} game_arg={top_arg:3d} std_val={std_val}  ({top_cnt}/{total}, conf={conf:.3f}) {marker}", file=sys.stderr)

    # COMPARE_OP
    cmpop_map = {}
    print(f"\n=== COMPARE_OP remap ===", file=sys.stderr)
    for sym, counts in cmpop_counts.items():
        top_arg, top_cnt = max(counts.items(), key=lambda kv: kv[1])
        total = sum(counts.values())
        conf = top_cnt / total
        std_val = STD_311_CMPOP_SYMBOL_TO_VAL.get(sym)
        if std_val is not None:
            cmpop_map[top_arg] = {"std_val": std_val, "symbol": sym, "count": top_cnt, "total": total, "confidence": round(conf, 4)}
        print(f"  sym={sym:4s} game_arg={top_arg:3d} std_val={std_val}  ({top_cnt}/{total}, conf={conf:.3f})", file=sys.stderr)

    out = {
        "binary_op": {str(k): v for k, v in binop_map.items()},
        "compare_op": {str(k): v for k, v in cmpop_map.items()},
        "_meta": {
            "files_processed": files,
            "binop_entries": len(binop_map),
            "cmpop_entries": len(cmpop_map),
        },
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
