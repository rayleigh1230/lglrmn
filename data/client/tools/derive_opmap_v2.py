"""v2: 手动解析 marshal 二进制，提取 co_code，不依赖 marshal.loads（在 3.12/3.13 上会崩）。

只解析顶层 code object 的 co_code，跳过 consts/names 等后续字段。

参考 CPython marshal.c w_object(CODE_TYPE) 顺序：
    TYPE_CODE byte (0x63 或带 FLAG_REF 的 0xe3)
    argcount      (4 bytes LE)
    posonlyargcount
    kwonlyargcount
    stacksize
    flags
    code          (TYPE_STRING + 4-byte len + bytes)
    consts        (tuple)
    ... 其余忽略
"""
import struct, re, json, os, sys
from pathlib import Path
from collections import defaultdict

DUMP_DIR = Path(os.environ.get("DUMP_DIR", r"E:\星际猎人\dumped\modules_all"))
OUT = Path(os.environ.get("OUT_OPMAP", r"E:\战斗模拟器\data\client\tools\game_opmap.json"))

INSTR_RE = re.compile(r">{0,2}\s*(\d+)\s+([A-Z][A-Z_0-9]*)\b")

TYPE_CODE = 0x63
FLAG_REF = 0x80
TYPE_STRING = 0x73       # 's'
TYPE_SHORT_ASCII = 0x7a  # 'z'
TYPE_SMALL_TUPLE = 0x29  # ')'  -- tuple with < 256 items, length 1 byte
TYPE_TUPLE = 0x74        # 't'  -- tuple, length 4 bytes


def read_code_bytes_only(data: bytes) -> bytes:
    """解析 marshal，只取顶层 code object 的 co_code。
    失败返回 None。
    """
    if not data:
        return None
    p = 0
    b0 = data[p]; p += 1
    if (b0 & ~FLAG_REF) != TYPE_CODE:
        return None
    # 5 个 4-byte int
    if p + 20 > len(data):
        return None
    p += 20
    # code 字段：TYPE_STRING + 4-byte len + bytes
    if p >= len(data):
        return None
    sb = data[p]; p += 1
    if (sb & ~FLAG_REF) != TYPE_STRING:
        # 某些情况下可能用 TYPE_SHORT_ASCII 等？code bytes 一般用 's'
        return None
    if p + 4 > len(data):
        return None
    (clen,) = struct.unpack_from("<I", data, p); p += 4
    if p + clen > len(data):
        return None
    return data[p:p+clen]


def main():
    opmap = defaultdict(lambda: defaultdict(int))
    files_processed = 0
    pairs_seen = 0
    parse_fail = 0

    for disasm_path in DUMP_DIR.rglob("*.disasm.txt"):
        marshal_name = disasm_path.name[:-len(".disasm.txt")] + ".marshal.bin"
        marshal_path = disasm_path.with_name(marshal_name)
        if not marshal_path.exists():
            continue
        try:
            data = marshal_path.read_bytes()
        except Exception:
            continue
        code_bytes = read_code_bytes_only(data)
        if code_bytes is None:
            parse_fail += 1
            continue

        try:
            text = disasm_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        # dis.dis 默认递归反汇编嵌套 code object —— 但 co_code 只是父级的。
        # 在 "Disassembly of <code object" 标记处截断，只保留父级指令。
        cut = text.find("Disassembly of <code object")
        if cut >= 0:
            text = text[:cut]

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
        if files_processed % 5000 == 0:
            print(f"  progress: {files_processed} files, {pairs_seen} pairs, {len(opmap)} opcodes, {parse_fail} parse_fail", file=sys.stderr, flush=True)

    print(f"\nTotal: {files_processed} files, {pairs_seen} pairs, parse_fail={parse_fail}", file=sys.stderr)
    print(f"Distinct byte values: {len(opmap)}", file=sys.stderr)

    final = {}
    conflicts = []
    for bv in sorted(opmap.keys()):
        mns = opmap[bv]
        top_mn, top_cnt = max(mns.items(), key=lambda kv: kv[1])
        total = sum(mns.values())
        conf = top_cnt / total
        final[bv] = {"mnemonic": top_mn, "count": top_cnt, "total": total, "confidence": round(conf, 4)}
        if len(mns) > 1 and conf < 0.99:
            conflicts.append((bv, dict(mns)))

    out = {
        "_meta": {
            "files_processed": files_processed,
            "pairs_seen": pairs_seen,
            "distinct_byte_values": len(opmap),
            "conflicts_count": len(conflicts),
            "parse_fail": parse_fail,
        },
        "opmap": {str(k): v for k, v in final.items()},
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT}", file=sys.stderr)
    if conflicts:
        print(f"\n=== Conflicts (<0.99) ===", file=sys.stderr)
        for bv, mns in conflicts[:30]:
            print(f"  byte {bv}: {mns}", file=sys.stderr)
    print(f"\n=== Opmap preview ===", file=sys.stderr)
    for bv in sorted(final.keys()):
        v = final[bv]
        print(f"  {bv:3d} -> {v['mnemonic']:30s}  ({v['count']}/{v['total']}, conf={v['confidence']})", file=sys.stderr)


if __name__ == "__main__":
    main()
