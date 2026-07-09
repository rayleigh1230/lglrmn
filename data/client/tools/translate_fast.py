"""快速翻译器：用 marshal.loads 直接解析 + 递归翻译 co_code。

比 translate_opcodes.py 的 walker 快 ~100x，因为不需要逐字节 parse marshal。
"""
import marshal, struct, json, sys, os, types
from pathlib import Path

OPMAP_PATH = Path(r"E:\战斗模拟器\data\client\tools\game_opmap.json")
CACHEMAP_PATH = Path(r"E:\战斗模拟器\data\client\tools\game_cachemap.json")
BINOP_PATH = Path(r"E:\战斗模拟器\data\client\tools\game_special_ops.json")

# 标准 CPython 3.11 inline cache 条目数
STD_311_CACHE = {
    106: 9, 107: 1, 116: 4, 119: 1, 122: 1, 145: 1, 146: 1, 147: 1,
    160: 9, 171: 3, 173: 1, 174: 1, 175: 1, 176: 1,
    25: 4, 95: 4, 92: 1, 93: 1,
}
PYC_MAGIC_311 = b'\xa7\x0d\x0d\x0a'

def load_mappings():
    with open(OPMAP_PATH, encoding="utf-8") as f:
        opmap_data = json.load(f)
    with open(CACHEMAP_PATH, encoding="utf-8") as f:
        cachemap_data = json.load(f)
    with open(BINOP_PATH, encoding="utf-8") as f:
        binop_data = json.load(f)

    # opmap: {"opmap": {"0": {"mnemonic": "...", "confidence": 1.0}, ...}}
    g2s = {}
    for k, v in opmap_data["opmap"].items():
        mn = v["mnemonic"]
        if mn in STD_311 and v["confidence"] >= 0.95:
            g2s[int(k)] = STD_311[mn]

    # cachemap: {"MNEMONIC": {"cache": N, "confidence": 1.0}, ...}
    gcache = {}
    for gb, std_op in g2s.items():
        mn = next((m for m, s in STD_311.items() if s == std_op), None)
        if mn and mn in cachemap_data and cachemap_data[mn].get("confidence", 0) >= 0.95:
            gcache[gb] = cachemap_data[mn]["cache"]
        else:
            gcache[gb] = 0

    # binop: {"binary_op": {"5": {"std_val": 5, "confidence": 1.0}, ...}} → map game_arg→std_arg
    binop = {}
    for k, v in binop_data.get("binary_op", {}).items():
        if v.get("confidence", 0) >= 0.9:
            binop[int(k)] = v["std_val"]
    return g2s, gcache, binop

def translate_bytecode(co_code, g2s, gcache, binop):
    """翻译一段 co_code (bytes) 的 game opcode → std 3.11 opcode + 补零 cache。

    算法对齐已验证的 translate_opcodes.py::_translate_code：
      - 已知 game 字节：写 std_op + (可能重映射的) arg + STD_311_CACHE 零填充，
        读指针跳过 game 侧 cache（game cache 行数可能与 std 不同，这正是翻译的意义）。
      - 未知 game 字节（典型为 0x00=inline CACHE 填充）：原样写出 (op,arg)，
        读指针只前进 2（不跳 cache）——pycdc 把 CACHE 当指令间填充，照原样保留即可。
    """
    out = bytearray()
    i = 0
    n = len(co_code)
    translated = 0
    unknown = 0
    while i < n:
        g_op = co_code[i]
        g_arg = co_code[i + 1] if i + 1 < n else 0
        g_cache_count = gcache.get(g_op)

        if g_op in g2s and g_cache_count is not None:
            # 已知：翻译 + 重打包
            i += 2 + g_cache_count * 2
            s_op = g2s[g_op]
            out.append(s_op)
            # BINARY_OP (122) arg 重映射
            out.append(binop.get(g_arg, g_arg) if s_op == 122 else g_arg)
            # 标准 cache 填充零
            s_cache_count = STD_311_CACHE.get(s_op, 0)
            for _ in range(s_cache_count):
                out.extend(b'\x00\x00')
            translated += 1
        else:
            # 未知：原样保留（含 0x00 CACHE 填充），只前进 2
            out.append(g_op)
            out.append(g_arg)
            i += 2
            unknown += 1

    return bytes(out), translated, unknown

# 标准 Python 3.11 opcode 名→码 映射
STD_311 = {
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

def translate_code_object(co, g2s, gcache, binop):
    """递归翻译一个 code object 及其所有嵌套 code objects 的 co_code"""
    new_code, n_trans, n_unk = translate_bytecode(co.co_code, g2s, gcache, binop)

    # 递归处理嵌套的 code objects (in co_consts)
    new_consts = []
    for c in co.co_consts:
        if isinstance(c, types.CodeType):
            new_consts.append(translate_code_object(c, g2s, gcache, binop))
        else:
            new_consts.append(c)

    # 创建新的 code object
    return co.replace(
        co_code=new_code,
        co_consts=tuple(new_consts),
    )

def translate_one(data, g2s, gcache, binop):
    """翻译一个 marshal.bin → 标准 3.11 pyc bytes"""
    co = marshal.loads(data)
    new_co = translate_code_object(co, g2s, gcache, binop)
    new_marshal = marshal.dumps(new_co)
    # 组装 .pyc: magic + padding + timestamp + size + marshal
    pyc = PYC_MAGIC_311 + b'\x00' * 12 + new_marshal
    return pyc

def main():
    IN_DIR = Path(os.environ.get("IN_DIR", r"E:\战斗模拟器\dumped\gdu_raw"))
    OUT_DIR = Path(os.environ.get("OUT_DIR", r"E:\战斗模拟器\dumped\gdu_translated_v2"))

    print("Loading mappings...")
    g2s, gcache, binop = load_mappings()
    print(f"game->std opcodes: {len(g2s)}, cache entries: {len(gcache)}")

    marshal_files = list(IN_DIR.rglob("*.marshal.bin"))
    total = len(marshal_files)
    print(f"Files to translate: {total}")

    ok = 0
    fail = 0
    for i, f in enumerate(marshal_files):
        try:
            rel = f.relative_to(IN_DIR)
            out_pyc = OUT_DIR / rel.parent / (rel.name[:-len(".marshal.bin")] + ".pyc")
            out_pyc.parent.mkdir(parents=True, exist_ok=True)
            pyc = translate_one(f.read_bytes(), g2s, gcache, binop)
            out_pyc.write_bytes(pyc)
            ok += 1
        except Exception as e:
            fail += 1
            if fail <= 10:
                print(f"FAIL: {f.name}: {e}")
        if (i + 1) % 100 == 0:
            print(f"Progress: {i+1}/{total} (ok={ok} fail={fail})")

    print(f"DONE: {ok} ok, {fail} fail out of {total}")
    print(f"Output: {OUT_DIR}")

if __name__ == "__main__":
    main()
