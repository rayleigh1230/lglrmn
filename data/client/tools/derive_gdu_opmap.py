"""从 game_data_utils 的 disasm.txt + marshal.bin 推导 data_manager 专用 opmap。

原理：游戏内 dis.dis(co) 显示标准 3.11 助记名（游戏只改了字节码执行引擎，没改 dis 模块），
      所以可以通过对比 disasm 文本中的 offset→mnemonic 和 marshal 中的 byte→offset，
      推导出 game_byte → std_mnemonic 的映射。

算法：dis.dis() 输出跳过 CACHE 条目，但其 offset 正确地 "跳过" 了 CACHE 占用的字节数。
      因此，物理 co_code 字节偏移 和 disasm 逻辑偏移 之间存在对应关系：
      - 指令字节所在位置 = disasm 中的 offset
      - CACHE 字节所在位置 ≠ disasm 中的任何 offset（自然过滤）
      用 i+=2 步进即可。
"""
import marshal, re, json, os
from pathlib import Path
from collections import defaultdict

GDU_RAW = Path(r"E:\战斗模拟器\dumped\gdu_raw\data_manager.game_data_utils")

# 标准 3.11 mnemonic → opcode 值
STD_311 = {
    "CACHE": 0, "POP_TOP": 1, "PUSH_NULL": 2, "NOP": 9,
    "UNARY_POSITIVE": 10, "UNARY_NEGATIVE": 11, "UNARY_NOT": 12, "UNARY_INVERT": 15,
    "BINARY_SUBSCR": 25, "GET_LEN": 30,
    "PUSH_EXC_INFO": 35, "CHECK_EXC_MATCH": 36, "CHECK_EG_MATCH": 37,
    "WITH_EXCEPT_START": 49, "GET_AITER": 50, "GET_ANEXT": 51,
    "BEFORE_ASYNC_WITH": 52, "BEFORE_WITH": 53, "END_ASYNC_FOR": 54,
    "STORE_SUBSCR": 60, "DELETE_SUBSCR": 61, "GET_ITER": 68, "GET_YIELD_FROM_ITER": 69,
    "PRINT_EXPR": 70, "LOAD_BUILD_CLASS": 71, "LOAD_ASSERTION_ERROR": 74,
    "RETURN_GENERATOR": 75, "LIST_TO_TUPLE": 82, "RETURN_VALUE": 83,
    "IMPORT_STAR": 84, "SETUP_ANNOTATIONS": 85, "YIELD_VALUE": 86, "ASYNC_GEN_WRAP": 87,
    "PREP_RERAISE_STAR": 88, "POP_EXCEPT": 89,
    "STORE_NAME": 90, "DELETE_NAME": 91, "UNPACK_SEQUENCE": 92, "FOR_ITER": 93,
    "UNPACK_EX": 94, "STORE_ATTR": 95, "DELETE_ATTR": 96, "STORE_GLOBAL": 97,
    "DELETE_GLOBAL": 98, "SWAP": 99, "LOAD_CONST": 100, "LOAD_NAME": 101,
    "BUILD_TUPLE": 102, "BUILD_LIST": 103, "BUILD_SET": 104, "BUILD_MAP": 105,
    "LOAD_ATTR": 106, "COMPARE_OP": 107, "IMPORT_NAME": 108, "IMPORT_FROM": 109,
    "JUMP_FORWARD": 110, "JUMP_IF_FALSE_OR_POP": 111, "JUMP_IF_TRUE_OR_POP": 112,
    "POP_JUMP_FORWARD_IF_FALSE": 114, "POP_JUMP_FORWARD_IF_TRUE": 115,
    "LOAD_GLOBAL": 116, "IS_OP": 117, "CONTAINS_OP": 118, "RERAISE": 119,
    "COPY": 120, "BINARY_OP": 122, "SEND": 123, "LOAD_FAST": 124, "STORE_FAST": 125,
    "DELETE_FAST": 126, "POP_JUMP_FORWARD_IF_NOT_NONE": 128,
    "POP_JUMP_FORWARD_IF_NONE": 129, "RAISE_VARARGS": 130, "GET_AWAITABLE": 131, "MAKE_FUNCTION": 132,
    "BUILD_SLICE": 133, "JUMP_BACKWARD_NO_INTERRUPT": 134,
    "MAKE_CELL": 135, "LOAD_CLOSURE": 136, "LOAD_DEREF": 137, "STORE_DEREF": 138,
    "DELETE_DEREF": 139, "JUMP_BACKWARD": 140,
    "CALL_FUNCTION_EX": 142, "EXTENDED_ARG": 144, "LIST_APPEND": 145, "SET_ADD": 146,
    "MAP_ADD": 147, "LOAD_CLASSDEREF": 148, "COPY_FREE_VARS": 149, "RESUME": 151,
    "MATCH_CLASS": 152, "FORMAT_VALUE": 155, "BUILD_CONST_KEY_MAP": 156,
    "BUILD_STRING": 157, "LOAD_METHOD": 160, "LIST_EXTEND": 162, "SET_UPDATE": 163,
    "DICT_MERGE": 164, "DICT_UPDATE": 165, "PRECALL": 166, "CALL": 171,
    "KW_NAMES": 172,
}
STD_MNEMONIC_TO_OP = {k: v for k, v in STD_311.items()}

# 标准 3.11 inline cache
STD_311_CACHE = {
    106: 9, 107: 1, 116: 4, 119: 1, 122: 1, 145: 1, 146: 1, 147: 1,
    160: 9, 171: 3, 173: 1, 174: 1, 175: 1, 176: 1,
    25: 4, 95: 4, 92: 1, 93: 1,
}


def parse_disasm_line(line):
    """解析 dis.dis() 输出的一行，返回 (offset, mnemonic) 或 None。

    dis.dis() 输出格式：
      带行号:  "3673           0 RESUME                   0"
      续行:    "               4 STORE_FAST               2 (add_base_num)"
    CACHE 条目在游戏 dis 模块中不输出（被跳过）。
    """
    if not line or line.startswith('#'):
        return None
    line = line.strip()
    if not line:
        return None
    parts = line.split()
    if len(parts) < 2:
        return None
    # 判断是否有行号：第一个 token 是 line_no（3-5 位数字），第二个 token 是 offset
    if parts[0].isdigit() and len(parts) >= 3 and parts[1].isdigit():
        # 有行号: line_no, offset, mnemonic, [arg, ...]
        return int(parts[1]), parts[2]
    elif parts[0].isdigit():
        # 续行: offset, mnemonic, [arg, ...]
        return int(parts[0]), parts[1]
    return None


def parse_disasm(disasm_text):
    """解析 dis.dis() 输出，返回 {offset: mnemonic}"""
    mapping = {}
    for line in disasm_text.splitlines():
        result = parse_disasm_line(line)
        if result:
            offset, mnemonic = result
            mapping[offset] = mnemonic
    return mapping


def derive_mapping():
    """从 disasm + marshal 推导 game_byte → std_opcode_value

    核心算法：
    - dis.dis() 输出跳过 CACHE，但 offset 数值正确地"跳过"了 CACHE 字节
    - 物理 co_code 字节偏移 = disasm 逻辑偏移（因为 CACHE 被 dis 跳过不显示）
    - 步进 i+=2, offset+=2 后，CACHE 字节位置在 disasm 中无对应条目，自然被过滤
    """
    byte_to_mnemonics = defaultdict(lambda: defaultdict(int))

    marshal_files = list(GDU_RAW.glob("*/*.marshal.bin"))
    processed = 0
    skipped = 0
    total = len(marshal_files)

    for idx, mf in enumerate(marshal_files):
        disasm = mf.parent / (mf.name[:-len(".marshal.bin")] + ".disasm.txt")
        if not disasm.exists():
            skipped += 1
            continue

        try:
            co = marshal.loads(mf.read_bytes())
        except Exception:
            skipped += 1
            continue

        disasm_mapping = parse_disasm(disasm.read_text(encoding="utf-8"))
        if not disasm_mapping:
            skipped += 1
            continue

        code = co.co_code
        i = 0
        offset = 0
        while i < len(code):
            game_byte = code[i]
            if offset in disasm_mapping:
                mnemonic = disasm_mapping[offset]
                byte_to_mnemonics[game_byte][mnemonic] += 1
            i += 2
            offset += 2

        processed += 1
        if (idx + 1) % 100 == 0:
            print(f"  Processed {idx+1}/{total} files...")

    print(f"Processed {processed} files, skipped {skipped}")

    # 对每个 game byte，取最常见的 mnemonic
    gdu_opmap = {}
    for gb in sorted(byte_to_mnemonics.keys()):
        mnemonics = byte_to_mnemonics[gb]
        best_mnemonic = max(mnemonics, key=mnemonics.get)
        count = mnemonics[best_mnemonic]
        total_votes = sum(mnemonics.values())
        confidence = count / total_votes if total_votes > 0 else 0

        if confidence >= 0.8:
            std_opcode = STD_MNEMONIC_TO_OP.get(best_mnemonic)
            if std_opcode is not None:
                gdu_opmap[gb] = {
                    "mnemonic": best_mnemonic,
                    "std_opcode": std_opcode,
                    "confidence": round(confidence, 3),
                    "count": count,
                    "total": total_votes,
                }
            else:
                print(f"  WARN: game byte {gb} maps to {best_mnemonic} but no std_opcode")
        else:
            alt_info = sorted(mnemonics.items(), key=lambda x: -x[1])[:5]
            print(f"  WARN: game byte {gb} confidence too low ({confidence:.2f}): {alt_info}")

    print(f"\nDerived {len(gdu_opmap)} opcode mappings")
    return gdu_opmap


def main():
    gdu_opmap = derive_mapping()

    game2std = {gb: info["std_opcode"] for gb, info in gdu_opmap.items()}

    print(f"\ngame2std ({len(game2std)} entries):")
    for gb in sorted(game2std.keys()):
        info = gdu_opmap[gb]
        print(f"  {gb:3d} -> {info['std_opcode']:3d} ({info['mnemonic']:30s}) conf={info['confidence']:.2f}")

    # 保存
    out = {
        "_meta": {
            "files_processed": len(list(GDU_RAW.glob("*/*.marshal.bin"))),
            "derived_from": "disasm.txt cross-reference with marshal.bin",
            "note": "data_manager.game_data_utils specific opmap",
        },
        "gdu_opmap": {str(gb): info for gb, info in gdu_opmap.items()},
        "game2std": {str(gb): v for gb, v in game2std.items()},
    }
    out_path = Path(r"E:\战斗模拟器\data\client\tools\gdu_opmap.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\nSaved: {out_path}")


if __name__ == "__main__":
    main()
