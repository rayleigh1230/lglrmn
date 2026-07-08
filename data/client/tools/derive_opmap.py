"""从 dump 出的 disasm.txt + 对应 marshal.bin 反推游戏自定义 opcode 映射表。

原理：
  - 每个 .disasm.txt 包含形如 `  0 RESUME                   0` 的行
  - 对应 marshal.bin 里的 code object 的 co_code[offset] 是真实字节值
  - 多个文件聚合后，能稳定得到 {byte_value: mnemonic}

输出：data/client/tools/game_opmap.json
  {
    "146": "RESUME",
    "0":   "LOAD_CONST",
    ...
  }

成功判据：每个 byte_value 只对应一个 mnemonic（无冲突）。
"""
import marshal, re, json, sys
from pathlib import Path
from collections import defaultdict

import os
DUMP_DIR = Path(os.environ.get("DUMP_DIR", r"E:\星际猎人\dumped\modules_all"))
OUT = Path(os.environ.get("OUT_OPMAP", r"E:\战斗模拟器\data\client\tools\game_opmap.json"))

# 匹配 disasm 行：开头是可选行号源码注释，然后是 `  OFFSET MNEMONIC ...`
# 我们的 disasm.txt 格式（probe_module_walk_all.py 写出）：
#   968           0 RESUME                   0
#   972           2 LOAD_CONST               1 (1)
# 即 `源行号(空格)偏移 助记符 ...`
# 但有时首列也可能没有源行号（一些 jump target 行 `>>  N MNEMONIC ...`）
# 稳健做法：找行内首个整数，要求它后面紧跟大写字母助记符
INSTR_RE = re.compile(
    r">{0,2}\s*(\d+)\s+([A-Z][A-Z_0-9]*)\b"
)

def load_code(pyc_path: Path):
    try:
        with open(pyc_path, "rb") as f:
            head = f.read(16)
            return marshal.loads(f.read())
    except Exception:
        return None


def walk_all_code(co):
    """yield (co_code_bytes,) for code object and all nested ones"""
    yield co
    for c in co.co_consts:
        if hasattr(c, "co_code"):
            yield from walk_all_code(c)


def main():
    # byte_value -> {mnemonic: count}
    opmap = defaultdict(lambda: defaultdict(int))
    files_processed = 0
    pairs_seen = 0

    # 只扫顶层 .pyc（每个目录下与 dir 同名的 pyc 是顶层 code object，
    # 但每个 pyc 里通过 co_consts 已经能拿到所有嵌套闭包，所以无需扫 .disasm 嵌套文件）
    # 不过我们的 walker 对每个嵌套闭包也单独写了 disasm.txt + pyc/marshal.bin，
    # 顶层扫一遍 .disasm.txt 即可，每条 disasm 行号都对应它自己 pyc 的 co_code[0]。
    # 实际上每条 disasm 行的 OFFSET 是相对于该 code object 的，所以最简单：扫 .disasm.txt，
    # 对应 .marshal.bin（没有 .pyc 的话），解析它的 co_code。

    for disasm_path in DUMP_DIR.rglob("*.disasm.txt"):
        # 文件名约定：<safe>.disasm.txt / <safe>.marshal.bin / <safe>.pyc
        marshal_name = disasm_path.name[:-len(".disasm.txt")] + ".marshal.bin"
        marshal_path = disasm_path.with_name(marshal_name)
        if not marshal_path.exists():
            continue
        print(f"  [debug] processing: {marshal_path}", file=sys.stderr, flush=True) if files_processed < 5 else None
        try:
            with open(marshal_path, "rb") as f:
                co = marshal.loads(f.read())
        except Exception:
            continue
        if not hasattr(co, "co_code"):
            continue
        code_bytes = co.co_code

        try:
            text = disasm_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        for line in text.splitlines():
            m = INSTR_RE.search(line)
            if not m:
                continue
            offset = int(m.group(1))
            mnemonic = m.group(2)
            if offset >= len(code_bytes):
                continue
            byte_val = code_bytes[offset]
            opmap[byte_val][mnemonic] += 1
            pairs_seen += 1

        files_processed += 1
        if files_processed % 2000 == 0:
            print(f"  progress: {files_processed} files, {pairs_seen} pairs, {len(opmap)} opcodes", file=sys.stderr, flush=True)

    print(f"\nTotal: {files_processed} files, {pairs_seen} pairs", file=sys.stderr)
    print(f"Distinct byte values seen: {len(opmap)}", file=sys.stderr)

    # 解析：取每个 byte_val 下出现次数最多的 mnemonic（容忍少量噪声）
    final = {}
    conflicts = []
    for byte_val in sorted(opmap.keys()):
        mns = opmap[byte_val]
        top_mn, top_cnt = max(mns.items(), key=lambda kv: kv[1])
        total = sum(mns.values())
        confidence = top_cnt / total
        final[byte_val] = {"mnemonic": top_mn, "count": top_cnt, "total": total, "confidence": round(confidence, 4)}
        if len(mns) > 1 and confidence < 0.95:
            conflicts.append((byte_val, dict(mns)))

    # 输出
    out = {
        "_meta": {
            "files_processed": files_processed,
            "pairs_seen": pairs_seen,
            "distinct_byte_values": len(opmap),
            "conflicts_count": len(conflicts),
        },
        "opmap": {str(k): v for k, v in final.items()},
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT}", file=sys.stderr)
    print(f"\n=== Conflicts (<0.95 confidence) ===", file=sys.stderr)
    for bv, mns in conflicts[:20]:
        print(f"  byte {bv}: {mns}", file=sys.stderr)

    # 简表预览
    print(f"\n=== Opmap preview ===", file=sys.stderr)
    for bv in sorted(final.keys()):
        v = final[bv]
        print(f"  {bv:3d} -> {v['mnemonic']:30s}  ({v['count']}/{v['total']}, conf={v['confidence']})", file=sys.stderr)


def load_code_by_marshal(path: Path):
    try:
        with open(path, "rb") as f:
            return marshal.loads(f.read())
    except Exception:
        return None


if __name__ == "__main__":
    main()
