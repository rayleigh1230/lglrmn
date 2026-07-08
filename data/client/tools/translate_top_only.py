"""简化翻译器：只翻译顶层 code object 的 co_code。

不递归走嵌套（避免 walker 死循环）。嵌套闭包在 dump 时已经各自独立成文件，
单独跑这个脚本即可翻译它们。

策略：
  1. 读 marshal.bin
  2. 解析顶层 code object 的固定 header (TYPE_CODE + 5*4 字节 int + TYPE_STRING + 4 字节 len)
  3. 取 co_code，按 game cache 表步进读，按 std cache 表写
  4. 重新拼接：header + new co_code + 原始剩余字节（consts/names/etc 原样保留）

注意：嵌套 code object（在 co_consts 里）保持原样不翻译。pycdc 反编译顶层函数时
不需要进入嵌套（嵌套有自己的 .pyc 文件）。
"""
import json, struct, os, sys
from pathlib import Path

OPMAP_PATH = Path(os.environ.get("OPMAP_PATH", r"E:\战斗模拟器\data\client\tools\game_opmap.json"))
CACHEMAP_PATH = Path(os.environ.get("CACHEMAP_PATH", r"E:\战斗模拟器\data\client\tools\game_cachemap.json"))
SPECIALOPS_PATH = Path(os.environ.get("SPECIALOPS_PATH", r"E:\战斗模拟器\data\client\tools\game_special_ops.json"))
IN_DIR = Path(os.environ.get("IN_DIR", r"E:\星际猎人\dumped\modules_all"))
OUT_DIR = Path(os.environ.get("OUT_DIR", r"E:\星际猎人\dumped\modules_all_translated"))

STD_311_CACHE = {
    100: 0, 101: 0, 102: 0, 103: 0, 104: 0, 105: 0,
    106: 9, 107: 1, 108: 0, 109: 0, 110: 0, 111: 0, 112: 0,
    114: 0, 115: 0, 116: 4, 117: 0, 118: 0, 119: 1, 120: 0,
    122: 1, 123: 0, 124: 0, 125: 0, 126: 0,
    128: 0, 129: 0, 130: 0, 131: 0, 132: 0,
    140: 0, 142: 0, 144: 0, 145: 1, 146: 1, 147: 1, 149: 0,
    151: 0, 155: 0, 156: 0, 157: 0,
    160: 9, 162: 0, 163: 0, 164: 0, 165: 0, 166: 0,
    171: 3, 173: 1, 174: 1, 175: 1, 176: 1,
    25: 4, 95: 4, 92: 1, 93: 1, 1: 0, 2: 0, 9: 0,
}

STD_311_OPCODE = {
    "CACHE": 0, "POP_TOP": 1, "PUSH_NULL": 2, "NOP": 9,
    "UNARY_POSITIVE": 10, "UNARY_NEGATIVE": 11, "UNARY_NOT": 12, "UNARY_INVERT": 15,
    "BINARY_SUBSCR": 25, "GET_LEN": 30, "MATCH_MAPPING": 31, "MATCH_SEQUENCE": 32,
    "MATCH_KEYS": 33, "PUSH_EXC_INFO": 35, "CHECK_EXC_MATCH": 36, "CHECK_EG_MATCH": 37,
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
    "DELETE_FAST": 126, "POP_JUMP_FORWARD_IF_NOT_NONE": 128, "POP_JUMP_FORWARD_IF_NONE": 129,
    "RAISE_VARARGS": 130, "GET_AWAITABLE": 131, "MAKE_FUNCTION": 132, "BUILD_SLICE": 133,
    "JUMP_BACKWARD_NO_INTERRUPT": 134, "MAKE_CELL": 135, "LOAD_CLOSURE": 136,
    "LOAD_DEREF": 137, "STORE_DEREF": 138, "DELETE_DEREF": 139, "JUMP_BACKWARD": 140,
    "CALL_FUNCTION_EX": 142, "EXTENDED_ARG": 144, "LIST_APPEND": 145, "SET_ADD": 146,
    "MAP_ADD": 147, "LOAD_CLASSDEREF": 148, "COPY_FREE_VARS": 149, "RESUME": 151,
    "MATCH_CLASS": 152, "FORMAT_VALUE": 155, "BUILD_CONST_KEY_MAP": 156,
    "BUILD_STRING": 157, "LOAD_METHOD": 160, "LIST_EXTEND": 162, "SET_UPDATE": 163,
    "DICT_MERGE": 164, "DICT_UPDATE": 165, "PRECALL": 166, "CALL": 171,
    "KW_NAMES": 172, "POP_JUMP_BACKWARD_IF_NOT_NONE": 173,
    "POP_JUMP_BACKWARD_IF_NONE": 174, "POP_JUMP_BACKWARD_IF_FALSE": 175,
    "POP_JUMP_BACKWARD_IF_TRUE": 176,
}


def load_mappings():
    opmap_data = json.loads(OPMAP_PATH.read_text(encoding="utf-8"))
    cachemap_data = json.loads(CACHEMAP_PATH.read_text(encoding="utf-8"))
    special_data = {}
    if SPECIALOPS_PATH.exists():
        special_data = json.loads(SPECIALOPS_PATH.read_text(encoding="utf-8"))

    game2std = {}
    for k, v in opmap_data["opmap"].items():
        mn = v["mnemonic"]
        if mn in STD_311_OPCODE and v["confidence"] >= 0.95:
            game2std[int(k)] = STD_311_OPCODE[mn]

    game_byte_to_cache = {}
    for gb, std_op in game2std.items():
        mn = next(m for m, s in STD_311_OPCODE.items() if s == std_op)
        if mn in cachemap_data and cachemap_data[mn]["confidence"] >= 0.95:
            game_byte_to_cache[gb] = cachemap_data[mn]["cache"]
        else:
            game_byte_to_cache[gb] = 0

    binop_arg_map = {}
    for k, v in special_data.get("binary_op", {}).items():
        if v.get("confidence", 0) >= 0.9:
            binop_arg_map[int(k)] = v["std_val"]

    return game2std, game_byte_to_cache, binop_arg_map


FLAG_REF = 0x80
TYPE_CODE = ord("c")   # 0x63
TYPE_STRING = ord("s") # 0x73


def translate_top_only(data: bytes, game2std, game_cache, binop_arg_map):
    """只翻译顶层 code object 的 co_code，剩余字节原样保留。"""
    if len(data) < 26:
        return data, 0, 0, 0
    p = 0
    type_byte = data[p]; p += 1
    if (type_byte & ~FLAG_REF) != TYPE_CODE:
        return data, 0, 0, 0  # 不是 code object

    header_ints_end = p + 20
    if header_ints_end > len(data):
        return data, 0, 0, 0
    p = header_ints_end

    if p >= len(data):
        return data, 0, 0, 0
    string_type = data[p]; p += 1
    if (string_type & ~FLAG_REF) != TYPE_STRING:
        return data, 0, 0, 0

    if p + 4 > len(data):
        return data, 0, 0, 0
    (code_len,) = struct.unpack_from("<I", data, p); p += 4
    if p + code_len > len(data):
        return data, 0, 0, 0
    code_bytes = data[p:p+code_len]
    code_end = p + code_len

    # 翻译 co_code
    new_code = bytearray()
    ops_ok = 0; ops_unknown = 0
    i = 0; n = len(code_bytes)
    while i < n:
        game_op = code_bytes[i]
        arg = code_bytes[i+1] if i + 1 < n else 0
        gc = game_cache.get(game_op)
        std_op = game2std.get(game_op)
        if std_op is not None and gc is not None:
            out_arg = arg
            if std_op == 122 and arg in binop_arg_map:
                out_arg = binop_arg_map[arg]
            new_code.append(std_op)
            new_code.append(out_arg)
            for _ in range(STD_311_CACHE.get(std_op, 0)):
                new_code.append(0); new_code.append(0)
            ops_ok += 1
            i += 2 + gc * 2
        else:
            new_code.append(game_op)
            new_code.append(arg)
            ops_unknown += 1
            i += 2

    # 重新拼接：TYPE_CODE byte + 20 ints + TYPE_STRING byte + 4-byte new len + new code + 剩余原始字节
    out = bytearray()
    out.append(type_byte)
    out.extend(data[1:header_ints_end])  # 20 bytes ints
    out.append(string_type)
    out.extend(struct.pack("<I", len(new_code)))
    out.extend(new_code)
    out.extend(data[code_end:])  # consts/names/etc 原样保留
    return bytes(out), 1, ops_ok, ops_unknown


PYC_MAGIC_311 = b"\xa7\x0d\x0d\x0a"


def translate_one(marshal_bin, game2std, game_cache, binop_arg_map):
    new_marshal, nc, no, nu = translate_top_only(marshal_bin, game2std, game_cache, binop_arg_map)
    pyc = PYC_MAGIC_311 + b"\x00" * 12 + new_marshal
    return pyc, nc, no, nu


# 全局 worker 状态
_G = None


def _worker_init(game2std, game_cache, binop_arg_map, in_dir, out_dir):
    global _G
    _G = (game2std, game_cache, binop_arg_map, in_dir, out_dir)


def _process_one(mp_path_str):
    from pathlib import Path
    game2std, game_cache, binop_arg_map, in_dir, out_dir = _G
    try:
        p = Path(mp_path_str)
        rel = p.relative_to(in_dir)
        out_pyc = out_dir / rel.parent / (rel.name[:-len(".marshal.bin")] + ".pyc")
        out_pyc.parent.mkdir(parents=True, exist_ok=True)
        mb = p.read_bytes()
        pyc, nc, no, nu = translate_one(mb, game2std, game_cache, binop_arg_map)
        out_pyc.write_bytes(pyc)
        return (nc, no, nu)
    except Exception:
        return None


def main():
    import multiprocessing as mp

    game2std, game_cache, binop_arg_map = load_mappings()
    print(f"[info] opcodes: {len(game2std)}, cache entries: {len(game_cache)}, binop: {len(binop_arg_map)}", file=sys.stderr)

    files = [str(p) for p in IN_DIR.rglob("*.marshal.bin")]
    print(f"[info] total files: {len(files)}", file=sys.stderr)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    NCPU = mp.cpu_count()
    print(f"[info] using {NCPU} workers", file=sys.stderr)

    with mp.Pool(NCPU, initializer=_worker_init, initargs=(game2std, game_cache, binop_arg_map, IN_DIR, OUT_DIR)) as pool:
        done = 0; tc = 0; to = 0; tu = 0; ff = 0
        for r in pool.imap_unordered(_process_one, files, chunksize=500):
            done += 1
            if r is None:
                ff += 1
            else:
                nc, no, nu = r
                tc += nc; to += no; tu += nu
            if done % 5000 == 0:
                print(f"  progress: {done}/{len(files)}  ops={to} unknown={tu} fail={ff}", file=sys.stderr, flush=True)

    print(f"\nDone. files={len(files)} codes={tc} ops={to} unknown={tu} fail={ff}", file=sys.stderr)


if __name__ == "__main__":
    main()
