"""opcode 翻译器 v2：按游戏 cache 表读取，按标准 cache 表写入。

策略：把 co_code 重打包，让 pycdc 看到的是标准布局：
  - 每个 game 指令 = 1 字节 opcode + 1 字节 arg + N*2 字节 cache (N=game_cache[mn])
  - 翻译后 = 1 字节 std_opcode + 1 字节 arg + M*2 字节零填充 (M=std_cache[std_op])
  - cache 内容丢弃（对反编译无影响）
"""
import json, struct, os, sys
from pathlib import Path

OPMAP_PATH = Path(os.environ.get("OPMAP_PATH", r"E:\战斗模拟器\data\client\tools\game_opmap.json"))
CACHEMAP_PATH = Path(os.environ.get("CACHEMAP_PATH", r"E:\战斗模拟器\data\client\tools\game_cachemap.json"))
SPECIALOPS_PATH = Path(os.environ.get("SPECIALOPS_PATH", r"E:\战斗模拟器\data\client\tools\game_special_ops.json"))
IN_DIR = Path(os.environ.get("IN_DIR", r"E:\星际猎人\dumped\modules_all"))
OUT_DIR = Path(os.environ.get("OUT_DIR", r"E:\星际猎人\dumped\modules_all_translated"))

# 标准 CPython 3.11 _inline_cache_entries 表
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

    # mnemonic -> game cache count
    game_byte_to_cache = {}
    for gb, std_op in game2std.items():
        mn = next(m for m, s in STD_311_OPCODE.items() if s == std_op)
        if mn in cachemap_data and cachemap_data[mn]["confidence"] >= 0.95:
            game_byte_to_cache[gb] = cachemap_data[mn]["cache"]
        else:
            game_byte_to_cache[gb] = 0

    # BINARY_OP arg 重映射（game arg -> std arg）
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
TYPE_FLOAT = ord("f")
TYPE_BINARY_FLOAT = ord("g")
TYPE_COMPLEX = ord("x")
TYPE_BINARY_COMPLEX = ord("y")
TYPE_STRING = ord("s")
TYPE_INTERNED = ord("t")
TYPE_REF = ord("r")
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


def strip_flag(t):
    return t & ~FLAG_REF


class Walker:
    def __init__(self, data: bytes, game2std: dict, game_cache: dict, binop_arg_map: dict):
        self.data = data
        self.pos = 0
        self.out = bytearray()
        self.game2std = game2std
        self.game_cache = game_cache
        self.binop_arg_map = binop_arg_map
        self.codes_translated = 0
        self.ops_translated = 0
        self.ops_unknown = 0

    def emit(self, b):
        if isinstance(b, int):
            self.out.append(b)
        else:
            self.out.extend(b)

    def read_byte(self):
        b = self.data[self.pos]; self.pos += 1
        return b

    def read_bytes(self, n):
        b = self.data[self.pos:self.pos+n]
        self.pos += n
        return b

    def walk(self):
        self._walk_object()
        self.out.extend(self.data[self.pos:])
        return bytes(self.out)

    def _walk_object(self):
        if self.pos >= len(self.data): return
        t = self.read_byte()
        if strip_flag(t) == TYPE_CODE:
            self._walk_code(t)
        else:
            self._walk_other(t)

    def _walk_code(self, t):
        self.emit(t)
        # 5 个 4-byte int
        self.emit(self.read_bytes(20))
        # code: TYPE_STRING + 4-byte len + bytes
        st = self.read_byte()
        if strip_flag(st) != TYPE_STRING:
            # 异常，原样复制剩余
            self.emit(st)
            self.out.extend(self.data[self.pos:])
            self.pos = len(self.data)
            return
        (clen,) = struct.unpack_from("<I", self.data, self.pos)
        self.pos += 4
        code_bytes = self.read_bytes(clen)
        new_code = self._translate_code(code_bytes)
        # emit TYPE_STRING + 4-byte NEW len + new bytes
        self.emit(st)
        self.emit(struct.pack("<I", len(new_code)))
        self.emit(new_code)
        # 后续 9 个字段（consts, names, localsplusnames, localspluskinds,
        # filename, name, qualname, firstlineno, linetable）
        for _ in range(9):
            if self.pos >= len(self.data): break
            self._walk_object()
        self.codes_translated += 1

    def _translate_code(self, code: bytes) -> bytes:
        """按 game cache 步进读取，按 std cache 重新打包写入"""
        out = bytearray()
        i = 0
        n = len(code)
        while i < n:
            game_op = code[i]
            arg = code[i+1] if i + 1 < n else 0
            game_cach = self.game_cache.get(game_op)
            std_op = self.game2std.get(game_op)

            if std_op is not None and game_cach is not None:
                # BINARY_OP arg 重映射
                out_arg = arg
                if std_op == 122 and arg in self.binop_arg_map:
                    out_arg = self.binop_arg_map[arg]
                out.append(std_op)
                out.append(out_arg)
                std_cach = STD_311_CACHE.get(std_op, 0)
                for _ in range(std_cach):
                    out.append(0); out.append(0)
                self.ops_translated += 1
                i += 2 + game_cach * 2
            else:
                out.append(game_op)
                out.append(arg)
                self.ops_unknown += 1
                i += 2
        return bytes(out)

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
        if bare == TYPE_FLOAT:
            (ln,) = struct.unpack_from("<B", self.data, self.pos); self.pos += 1
            self.emit(struct.pack("<B", ln))
            self.emit(self.read_bytes(ln)); return
        if bare == TYPE_COMPLEX:
            (ln,) = struct.unpack_from("<B", self.data, self.pos); self.pos += 1
            self.emit(struct.pack("<B", ln))
            self.emit(self.read_bytes(ln)); return
        if bare in (TYPE_STRING, TYPE_UNICODE, TYPE_ASCII, TYPE_ASCII_INTRED):
            (ln,) = struct.unpack_from("<I", self.data, self.pos); self.pos += 4
            self.emit(struct.pack("<I", ln))
            self.emit(self.read_bytes(ln)); return
        if bare in (TYPE_SHORT_ASCII, TYPE_SHORT_ASCII_INTRED):
            (ln,) = struct.unpack_from("<B", self.data, self.pos); self.pos += 1
            self.emit(struct.pack("<B", ln))
            self.emit(self.read_bytes(ln)); return
        if bare == TYPE_SMALL_TUPLE:
            (ln,) = struct.unpack_from("<B", self.data, self.pos); self.pos += 1
            self.emit(struct.pack("<B", ln))
            for _ in range(ln):
                self._walk_object()
            return
        if bare == TYPE_TUPLE:
            (ln,) = struct.unpack_from("<I", self.data, self.pos); self.pos += 4
            self.emit(struct.pack("<I", ln))
            for _ in range(ln):
                self._walk_object()
            return
        if bare == TYPE_LIST or bare == TYPE_SET or bare == TYPE_FROZENSET:
            (ln,) = struct.unpack_from("<I", self.data, self.pos); self.pos += 4
            self.emit(struct.pack("<I", ln))
            for _ in range(ln):
                self._walk_object()
            return
        if bare == TYPE_DICT:
            while True:
                if self.pos >= len(self.data): break
                t2 = self.data[self.pos]
                if strip_flag(t2) == TYPE_NULL:
                    self.pos += 1
                    self.emit(TYPE_NULL)
                    break
                self._walk_object()
                self._walk_object()
            return
        if bare == TYPE_REF:
            self.emit(self.read_bytes(4)); return
        print(f"[warn] unknown marshal type {hex(t)}, copying rest", file=sys.stderr)
        self.out.extend(self.data[self.pos:])
        self.pos = len(self.data)


PYC_MAGIC_311 = b"\xa7\x0d\x0d\x0a"


def translate_one(marshal_bin: bytes, game2std: dict, game_cache: dict, binop_arg_map: dict):
    w = Walker(marshal_bin, game2std, game_cache, binop_arg_map)
    new_marshal = w.walk()
    pyc = PYC_MAGIC_311 + b"\x00" * 12 + new_marshal
    return pyc, w.codes_translated, w.ops_translated, w.ops_unknown


def main():
    import multiprocessing as mp
    from functools import partial

    game2std, game_cache, binop_arg_map = load_mappings()
    print(f"[info] game->std opcodes: {len(game2std)}, game cache: {len(game_cache)}, binop_arg: {len(binop_arg_map)}", file=sys.stderr)

    files = list(IN_DIR.rglob("*.marshal.bin"))
    print(f"[info] total marshal.bin: {len(files)}", file=sys.stderr)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 用全局变量传递给 worker（避免每个 task 复制大字典）
    global _G_GAME2STD, _G_GAME_CACHE, _G_BINOP_ARG_MAP, _G_IN_DIR, _G_OUT_DIR
    _G_GAME2STD = game2std
    _G_GAME_CACHE = game_cache
    _G_BINOP_ARG_MAP = binop_arg_map
    _G_IN_DIR = IN_DIR
    _G_OUT_DIR = OUT_DIR

    NCPU = mp.cpu_count()
    print(f"[info] using {NCPU} workers", file=sys.stderr)

    with mp.Pool(NCPU) as pool:
        results = pool.imap_unordered(_process_one, files, chunksize=200)
        done = 0; total_codes = 0; total_ops = 0; total_unknown = 0
        files_with_unknown = 0; files_failed = 0
        for r in results:
            done += 1
            if r is None:
                files_failed += 1
            else:
                nc, no, nu = r
                total_codes += nc; total_ops += no; total_unknown += nu
                if nu > 0: files_with_unknown += 1
            if done % 5000 == 0:
                print(f"  progress: {done}/{len(files)}  codes={total_codes} ops={total_ops} unknown={total_unknown} fail={files_failed}", file=sys.stderr, flush=True)

    print(f"\nDone. files={len(files)} codes_translated={total_codes}", file=sys.stderr)
    print(f"  ops_translated={total_ops}  ops_unknown={total_unknown}", file=sys.stderr)
    print(f"  files_with_unknown={files_with_unknown}  files_failed={files_failed}", file=sys.stderr)


# 全局 worker 状态
_G_GAME2STD = None
_G_GAME_CACHE = None
_G_BINOP_ARG_MAP = None
_G_IN_DIR = None
_G_OUT_DIR = None


def _process_one(mp_path):
    """worker 函数：用 fork 继承的全局映射表处理单个文件"""
    try:
        from pathlib import Path
        p = Path(mp_path)
        rel = p.relative_to(_G_IN_DIR)
        out_pyc = _G_OUT_DIR / rel.parent / (rel.name[:-len(".marshal.bin")] + ".pyc")
        out_pyc.parent.mkdir(parents=True, exist_ok=True)
        mb = p.read_bytes()
        pyc, nc, no, nu = translate_one(mb, _G_GAME2STD, _G_GAME_CACHE, _G_BINOP_ARG_MAP)
        out_pyc.write_bytes(pyc)
        return (nc, no, nu)
    except Exception:
        return None


if __name__ == "__main__":
    main()
