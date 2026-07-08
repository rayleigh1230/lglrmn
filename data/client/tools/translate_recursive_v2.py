"""递归 opcode 翻译器 v2：翻译顶层 AND 所有嵌套 code object 的 co_code。

修复 translate_opcodes.py 的卡死问题：
  1. 严格边界检查（长度字段 sanity 阈值）
  2. MAX_DEPTH 防止深度爆炸
  3. try/except 包整个 walk，失败回退到 top-level-only 翻译
  4. 由外层 batch runner 用 subprocess 超时保护 worker

用途：DPS 公式（get_ship_dps_calc 等）含嵌套闭包，pycdc 会递归进去；
若嵌套 co_code 未翻译，会撞上 "Unsupported opcode: MAKE_CELL (225)" 而输出空。
"""
import json, struct, os, sys
from pathlib import Path

OPMAP_PATH = Path(os.environ.get("OPMAP_PATH", r"E:\战斗模拟器\data\client\tools\game_opmap.json"))
CACHEMAP_PATH = Path(os.environ.get("CACHEMAP_PATH", r"E:\战斗模拟器\data\client\tools\game_cachemap.json"))
SPECIALOPS_PATH = Path(os.environ.get("SPECIALOPS_PATH", r"E:\战斗模拟器\data\client\tools\game_special_ops.json"))
IN_DIR = Path(os.environ.get("IN_DIR", r"E:\星际猎人\dumped\modules_all"))
OUT_DIR = Path(os.environ.get("OUT_DIR", r"E:\星际猎人\dumped\modules_all_translated_v2"))

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


# === Marshal 类型常量 ===
FLAG_REF = 0x80
TYPE_NULL = ord("0")
TYPE_NONE = ord("N")
TYPE_FALSE = ord("F")
TYPE_TRUE = ord("T")
TYPE_STOPITER = ord("S")
TYPE_ELLIPSIS = ord(".")
TYPE_INT = ord("i")
TYPE_INT64 = ord("I")
TYPE_BINARY_FLOAT = ord("g")
TYPE_BINARY_COMPLEX = ord("y")
TYPE_STRING = ord("s")
TYPE_TUPLE = ord("(")
TYPE_LIST = ord("[")
TYPE_DICT = ord("{")
TYPE_CODE = ord("c")
TYPE_UNICODE = ord("u")
TYPE_SET = ord("<")
TYPE_FROZENSET = ord(">")
TYPE_ASCII = ord("a")
TYPE_ASCII_INTRED = ord("A")
TYPE_SHORT_ASCII = ord("z")
TYPE_SHORT_ASCII_INTRED = ord("Z")
TYPE_SMALL_TUPLE = ord(")")
TYPE_REF = ord("r")

MAX_DEPTH = 64
MAX_COLLECTION = 1_000_000  # 长度字段 sanity 上限；marshal 不可能有 100 万元组的常量
MAX_STRING = 64 * 1024 * 1024  # 64MB 上限


class WalkAbort(Exception):
    pass


def strip_flag(t):
    return t & ~FLAG_REF


def translate_code_bytes(code: bytes, game2std, game_cache, binop_arg_map):
    """按 game cache 步进读取，按 std cache 重新打包写入。

    关键修复：jump 指令的相对操作数必须重定位——因为 game 和 std 的 cache 布局不同，
    改写后每条指令的字节长度变化，相对 jump 偏移会错位。
    """
    # 相对前向跳转（std opcode 值）
    JUMP_FWD = {110, 111, 112, 114, 115, 128, 129, 93, 123}
    # 相向后向跳转（std opcode 值）
    JUMP_BWD = {140, 134, 175, 176, 173, 174}

    n = len(code)

    # Pass 1: 建立 game_offset → std_offset 映射（按指令边界）
    g2s = {}
    g = 0
    s = 0
    while g < n:
        g2s[g] = s
        game_op = code[g]
        gc = game_cache.get(game_op, 0)
        std_op = game2std.get(game_op)
        std_cache = STD_311_CACHE.get(std_op, 0) if std_op is not None else gc
        g += 2 + gc * 2
        s += 2 + std_cache * 2
    g2s[n] = s  # 尾端

    # Pass 2: 翻译并重定位 jump 操作数
    out = bytearray()
    g = 0
    while g < n:
        s_now = g2s[g]
        game_op = code[g]
        arg = code[g + 1] if g + 1 < n else 0
        game_cach = game_cache.get(game_op)
        std_op = game2std.get(game_op)

        if std_op is not None and game_cach is not None:
            out_arg = arg
            # BINARY_OP arg 重映射
            if std_op == 122 and arg in binop_arg_map:
                out_arg = binop_arg_map[arg]
            # jump 重定位
            if std_op in JUMP_FWD:
                target_game = g + 2 + arg * 2
                target_std = g2s.get(target_game)
                if target_std is not None:
                    new_arg = (target_std - (s_now + 2)) // 2
                    if 0 <= new_arg <= 255:
                        out_arg = new_arg
                    # else: 保持原 arg（罕见情况，留待 EXTENDED_ARG 支持）
            elif std_op in JUMP_BWD:
                target_game = g + 2 - arg * 2
                target_std = g2s.get(target_game)
                if target_std is not None:
                    new_arg = (s_now + 2 - target_std) // 2
                    if 0 <= new_arg <= 255:
                        out_arg = new_arg

            out.append(std_op)
            out.append(out_arg)
            for _ in range(STD_311_CACHE.get(std_op, 0)):
                out.append(0); out.append(0)
            g += 2 + game_cach * 2
        else:
            out.append(game_op)
            out.append(arg)
            g += 2

    return bytes(out)


class Walker:
    def __init__(self, data, game2std, game_cache, binop_arg_map):
        self.data = data
        self.pos = 0
        self.out = bytearray()
        self.game2std = game2std
        self.game_cache = game_cache
        self.binop_arg_map = binop_arg_map
        self.codes_translated = 0
        self.depth = 0

    def emit(self, b):
        if isinstance(b, int):
            self.out.append(b)
        else:
            self.out.extend(b)

    def read_byte(self):
        if self.pos >= len(self.data):
            raise WalkAbort("read_byte EOF")
        b = self.data[self.pos]
        self.pos += 1
        return b

    def read_bytes(self, n):
        if self.pos + n > len(self.data):
            raise WalkAbort(f"read_bytes EOF pos={self.pos} n={n}")
        b = self.data[self.pos:self.pos + n]
        self.pos += n
        return b

    def read_u32(self):
        if self.pos + 4 > len(self.data):
            raise WalkAbort("read_u32 EOF")
        (v,) = struct.unpack_from("<I", self.data, self.pos)
        self.pos += 4
        return v

    def read_u8(self):
        if self.pos >= len(self.data):
            raise WalkAbort("read_u8 EOF")
        v = self.data[self.pos]
        self.pos += 1
        return v

    def walk(self):
        self._walk_object()
        self.out.extend(self.data[self.pos:])
        return bytes(self.out)

    def _walk_object(self):
        if self.depth > MAX_DEPTH:
            raise WalkAbort(f"depth>{MAX_DEPTH}")
        if self.pos >= len(self.data):
            return
        t = self.read_byte()
        self.depth += 1
        try:
            if strip_flag(t) == TYPE_CODE:
                self._walk_code(t)
            else:
                self._walk_other(t)
        finally:
            self.depth -= 1

    def _walk_code(self, t):
        self.emit(t)
        # 5 个 4-byte int (co_argcount, co_posonlyargcount, co_kwonlyargcount,
        # co_stacksize, co_flags)
        self.emit(self.read_bytes(20))
        # code: TYPE_STRING + 4-byte len + bytes
        st = self.read_byte()
        if strip_flag(st) != TYPE_STRING:
            raise WalkAbort(f"code expect STRING got {hex(st)}")
        clen = self.read_u32()
        if clen > MAX_STRING:
            raise WalkAbort(f"code too big {clen}")
        code_bytes = self.read_bytes(clen)
        new_code = translate_code_bytes(code_bytes, self.game2std, self.game_cache, self.binop_arg_map)
        self.emit(st)
        self.emit(struct.pack("<I", len(new_code)))
        self.emit(new_code)
        # 后续字段（Python 3.11）：
        #   consts, names, localsplusnames, localspluskinds,
        #   filename, name, qualname      (7 个 marshal object)
        #   firstlineno                   (raw 4-byte long，不是 object！)
        #   linetable, exceptiontable     (2 个 marshal object)
        for _ in range(7):
            if self.pos >= len(self.data):
                raise WalkAbort("code field EOF")
            self._walk_object()
        # firstlineno: raw long
        self.emit(self.read_bytes(4))
        for _ in range(2):
            if self.pos >= len(self.data):
                raise WalkAbort("code field EOF")
            self._walk_object()
        self.codes_translated += 1

    def _walk_other(self, t):
        bare = strip_flag(t)
        self.emit(t)
        if bare in (TYPE_NONE, TYPE_FALSE, TYPE_TRUE, TYPE_STOPITER, TYPE_ELLIPSIS, TYPE_NULL):
            return
        if bare == TYPE_INT:
            self.emit(self.read_bytes(4)); return
        if bare == TYPE_INT64:
            self.emit(self.read_bytes(8)); return
        if bare == TYPE_BINARY_FLOAT:
            self.emit(self.read_bytes(8)); return
        if bare == TYPE_BINARY_COMPLEX:
            self.emit(self.read_bytes(16)); return
        if bare in (TYPE_STRING, TYPE_UNICODE, TYPE_ASCII, TYPE_ASCII_INTRED):
            ln = self.read_u32()
            if ln > MAX_STRING:
                raise WalkAbort(f"str too big {ln}")
            self.emit(struct.pack("<I", ln))
            self.emit(self.read_bytes(ln)); return
        if bare in (TYPE_SHORT_ASCII, TYPE_SHORT_ASCII_INTRED):
            ln = self.read_u8()
            self.emit(struct.pack("<B", ln))
            self.emit(self.read_bytes(ln)); return
        if bare == TYPE_SMALL_TUPLE:
            ln = self.read_u8()
            if ln > 255:
                raise WalkAbort(f"small_tuple big {ln}")
            self.emit(struct.pack("<B", ln))
            for _ in range(ln):
                self._walk_object()
            return
        if bare == TYPE_TUPLE:
            ln = self.read_u32()
            if ln > MAX_COLLECTION:
                raise WalkAbort(f"tuple too big {ln}")
            self.emit(struct.pack("<I", ln))
            for _ in range(ln):
                self._walk_object()
            return
        if bare in (TYPE_LIST, TYPE_SET, TYPE_FROZENSET):
            ln = self.read_u32()
            if ln > MAX_COLLECTION:
                raise WalkAbort(f"list/set too big {ln}")
            self.emit(struct.pack("<I", ln))
            for _ in range(ln):
                self._walk_object()
            return
        if bare == TYPE_DICT:
            # 字典以 TYPE_NULL 终止
            while True:
                if self.pos >= len(self.data):
                    raise WalkAbort("dict EOF no NULL")
                t2 = self.data[self.pos]
                if strip_flag(t2) == TYPE_NULL:
                    self.pos += 1
                    self.emit(TYPE_NULL)
                    break
                self._walk_object()
                self._walk_object()
            return
        if bare == TYPE_REF:  # 'r'
            self.emit(self.read_bytes(4)); return
        raise WalkAbort(f"unknown marshal type {hex(t)}")


PYC_MAGIC_311 = b"\xa7\x0d\x0d\x0a"


def translate_recursive(marshal_bin, game2std, game_cache, binop_arg_map):
    """尝试递归翻译；失败则回退到 top-level-only。"""
    try:
        w = Walker(marshal_bin, game2std, game_cache, binop_arg_map)
        new_marshal = w.walk()
        pyc = PYC_MAGIC_311 + b"\x00" * 12 + new_marshal
        return pyc, w.codes_translated, "recursive"
    except (WalkAbort, Exception) as e:
        # 回退到 top-level only
        pyc, nc, _ok, _unk = translate_top_only_fallback(marshal_bin, game2std, game_cache, binop_arg_map)
        return pyc, nc, f"fallback:{type(e).__name__}"


def translate_top_only_fallback(data, game2std, game_cache, binop_arg_map):
    """复用 translate_top_only.py 的顶层逻辑作为 fallback。"""
    if len(data) < 26:
        return PYC_MAGIC_311 + b"\x00" * 12 + data, 0, 0, 0
    p = 0
    type_byte = data[p]; p += 1
    if (type_byte & ~FLAG_REF) != TYPE_CODE:
        return PYC_MAGIC_311 + b"\x00" * 12 + data, 0, 0, 0
    header_ints_end = p + 20
    if header_ints_end > len(data):
        return PYC_MAGIC_311 + b"\x00" * 12 + data, 0, 0, 0
    p = header_ints_end
    if p >= len(data):
        return PYC_MAGIC_311 + b"\x00" * 12 + data, 0, 0, 0
    string_type = data[p]; p += 1
    if (string_type & ~FLAG_REF) != TYPE_STRING:
        return PYC_MAGIC_311 + b"\x00" * 12 + data, 0, 0, 0
    if p + 4 > len(data):
        return PYC_MAGIC_311 + b"\x00" * 12 + data, 0, 0, 0
    (code_len,) = struct.unpack_from("<I", data, p); p += 4
    if p + code_len > len(data):
        return PYC_MAGIC_311 + b"\x00" * 12 + data, 0, 0, 0
    code_bytes = data[p:p + code_len]
    code_end = p + code_len

    new_code = bytearray()
    ops_ok = 0; ops_unknown = 0
    i = 0; n = len(code_bytes)
    while i < n:
        game_op = code_bytes[i]
        arg = code_bytes[i + 1] if i + 1 < n else 0
        gc = game_cache.get(game_op)
        std_op = game2std.get(game_op)
        if std_op is not None and gc is not None:
            out_arg = arg
            if std_op == 122 and arg in binop_arg_map:
                out_arg = binop_arg_map[arg]
            new_code.append(std_op); new_code.append(out_arg)
            for _ in range(STD_311_CACHE.get(std_op, 0)):
                new_code.append(0); new_code.append(0)
            ops_ok += 1
            i += 2 + gc * 2
        else:
            new_code.append(game_op); new_code.append(arg)
            ops_unknown += 1
            i += 2

    out = bytearray()
    out.append(type_byte)
    out.extend(data[1:header_ints_end])
    out.append(string_type)
    out.extend(struct.pack("<I", len(new_code)))
    out.extend(new_code)
    out.extend(data[code_end:])
    return PYC_MAGIC_311 + b"\x00" * 12 + bytes(out), 1, ops_ok, ops_unknown


# === Worker 入口 ===
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
        pyc, nc, mode = translate_recursive(mb, game2std, game_cache, binop_arg_map)
        out_pyc.write_bytes(pyc)
        return (nc, mode)
    except Exception:
        return None


def main():
    import multiprocessing as mp

    game2std, game_cache, binop_arg_map = load_mappings()
    print(f"[info] opcodes: {len(game2std)}, cache: {len(game_cache)}, binop: {len(binop_arg_map)}", file=sys.stderr)

    files = [str(p) for p in IN_DIR.rglob("*.marshal.bin")]
    print(f"[info] total files: {len(files)}", file=sys.stderr)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    NCPU = mp.cpu_count()
    print(f"[info] using {NCPU} workers", file=sys.stderr)

    counts = {"recursive": 0, "fallback": 0, "fail": 0}
    total_codes = 0
    done = 0
    with mp.Pool(NCPU, initializer=_worker_init, initargs=(game2std, game_cache, binop_arg_map, IN_DIR, OUT_DIR)) as pool:
        for r in pool.imap_unordered(_process_one, files, chunksize=200):
            done += 1
            if r is None:
                counts["fail"] += 1
            else:
                nc, mode_key = r
                total_codes += nc
                # mode 可能是 "recursive" 或 "fallback:XXX"
                key = "recursive" if mode_key == "recursive" else "fallback"
                counts[key] += 1
            if done % 5000 == 0:
                print(f"  progress: {done}/{len(files)}  recursive={counts['recursive']} fallback={counts['fallback']} fail={counts['fail']}", file=sys.stderr, flush=True)

    print(f"\nDone. files={len(files)}", file=sys.stderr)
    print(f"  recursive (full nested): {counts['recursive']}", file=sys.stderr)
    print(f"  fallback (top-only):     {counts['fallback']}", file=sys.stderr)
    print(f"  fail:                    {counts['fail']}", file=sys.stderr)
    print(f"  total code objects translated: {total_codes}", file=sys.stderr)


if __name__ == "__main__":
    main()
