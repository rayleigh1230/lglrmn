"""从 disasm.txt 推算游戏每个 opcode 的 cache 项数。

原理：
  对每个 disasm 文件，提取所有 (offset, mnemonic) 对
  对每对相邻指令 (off1, mn1) → (off2, mn2)：
    cache_entries(mn1) = (off2 - off1 - 2) / 2
  按 mnemonic 聚合，取众数
"""
import re, json, os, sys, struct
from pathlib import Path
from collections import defaultdict, Counter

DUMP_DIR = Path(os.environ.get("DUMP_DIR", r"E:\星际猎人\dumped\modules_all"))
OUT = Path(os.environ.get("OUT_CACHEMAP", r"E:\战斗模拟器\data\client\tools\game_cachemap.json"))

INSTR_RE = re.compile(r">{0,2}\s*(\d+)\s+([A-Z][A-Z_0-9]*)\b")


def extract_code_bytes(marshal_bin: bytes):
    """复用 derive_opmap_v2 的解析"""
    if not marshal_bin or len(marshal_bin) < 26:
        return None
    p = 0
    b0 = marshal_bin[p]; p += 1
    TYPE_CODE = 0x63
    FLAG_REF = 0x80
    if (b0 & ~FLAG_REF) != TYPE_CODE:
        return None
    if p + 20 > len(marshal_bin):
        return None
    p += 20
    if p >= len(marshal_bin):
        return None
    sb = marshal_bin[p]; p += 1
    TYPE_STRING = 0x73
    if (sb & ~FLAG_REF) != TYPE_STRING:
        return None
    if p + 4 > len(marshal_bin):
        return None
    (clen,) = struct.unpack_from("<I", marshal_bin, p); p += 4
    if p + clen > len(marshal_bin):
        return None
    return marshal_bin[p:p+clen]


def main():
    # mnemonic -> Counter of cache counts
    cache_counts = defaultdict(Counter)
    files = 0

    for disasm_path in DUMP_DIR.rglob("*.disasm.txt"):
        marshal_name = disasm_path.name[:-len(".disasm.txt")] + ".marshal.bin"
        marshal_path = disasm_path.with_name(marshal_name)
        if not marshal_path.exists():
            continue
        try:
            data = marshal_path.read_bytes()
        except Exception:
            continue
        # 不需要 co_code 内容，只需要 disasm 的 offset 序列

        try:
            text = disasm_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue

        cut = text.find("Disassembly of <code object")
        if cut >= 0:
            text = text[:cut]

        instrs = []
        for line in text.splitlines():
            m = INSTR_RE.search(line)
            if not m:
                continue
            offset = int(m.group(1))
            mnemonic = m.group(2)
            instrs.append((offset, mnemonic))

        if len(instrs) < 2:
            continue

        # 按 offset 排序，逐对计算
        instrs.sort()
        for i in range(len(instrs) - 1):
            off1, mn1 = instrs[i]
            off2, _ = instrs[i+1]
            delta = off2 - off1
            if delta < 2:
                continue
            cach = (delta - 2) // 2
            if (delta - 2) % 2 != 0:
                continue  # 对齐不对，跳过
            cache_counts[mn1][cach] += 1

        files += 1
        if files % 5000 == 0:
            print(f"  progress: {files} files", file=sys.stderr, flush=True)

    print(f"\nTotal: {files} files", file=sys.stderr)
    print(f"Distinct mnemonics: {len(cache_counts)}", file=sys.stderr)

    out = {}
    print(f"\n=== Cache table ===", file=sys.stderr)
    for mn in sorted(cache_counts.keys()):
        c = cache_counts[mn]
        top, cnt = c.most_common(1)[0]
        total = sum(c.values())
        conf = cnt / total
        out[mn] = {"cache": top, "count": cnt, "total": total, "confidence": round(conf, 4)}
        flag = "" if conf >= 0.95 else "  <-- LOW CONF"
        print(f"  {mn:30s}  cache={top:2d}  ({cnt}/{total}, conf={conf:.3f}){flag}", file=sys.stderr)

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
