"""小批量测试 translate_recursive_v2 + pycdc，目标：DPS 公式能反编译出来。"""
import os, sys, subprocess, time
from pathlib import Path

# 先设置环境
os.environ.setdefault("IN_DIR", r"E:\星际猎人\dumped\modules_all")
os.environ.setdefault("OUT_DIR", r"E:\星际猎人\dumped\modules_all_translated_v2")

sys.path.insert(0, str(Path(__file__).parent))
from translate_recursive_v2 import load_mappings, translate_recursive, PYC_MAGIC_311, Walker, WalkAbort

# 关键文件（DPS 公式 + 嵌套闭包）
KEY_PATTERNS = [
    "data.ship_attr_calc.AttrCalcBase.get_ship_dps_calc",
    "data.ship_attr_calc.AttrCalcBase.get_ship_dps_calc._nested_._add_new_calc",
    "data.ship_attr_calc.AttrCalcBase.get_weapon_ship_dps_calc",
    "data.ship_attr_calc.AttrCalcBase.get_aircraft_dps_calc",
    "data.ship_attr_calc.AttrCalcBase.get_module_total_dps_calc",
    "data.ship_attr_calc.AttrCalcBase.get_cur_enhance_add_info",
    "data.ship_attr_calc.AttrCalcBase.get_weapon_attack_calc",
    "data.ship_attr_calc.AttrCalcBase.get_weapon_dps_dph",
    "data.ship_attr_calc.AttrCalcBase.get_weapon_dps_dph_calc",
    "data.ship_attr_calc.AttrCalcBase.get_weapon_destroy_coef_dps_calc",
]

IN_DIR = Path(os.environ["IN_DIR"])
OUT_DIR = Path(os.environ["OUT_DIR"])
OUT_DIR.mkdir(parents=True, exist_ok=True)

PYCDC = r"C:\Users\Administrator\pycdc\build\pycdc.exe"
if not Path(PYCDC).exists():
    # WSL path fallback
    PYCDC = None

game2std, game_cache, binop_arg_map = load_mappings()
print(f"[info] opcodes: {len(game2std)}", flush=True)

# 收集目标文件
targets = []
for pat in KEY_PATTERNS:
    d = IN_DIR / pat
    if d.is_dir():
        for mb in d.glob("*.marshal.bin"):
            targets.append((pat, mb))
    else:
        print(f"[WARN] not found: {pat}")

print(f"[info] target files: {len(targets)}", flush=True)

# 翻译
out_pycs = []
for pat, mb in targets:
    rel = mb.relative_to(IN_DIR)
    out_pyc = OUT_DIR / rel.parent / (rel.name[:-len(".marshal.bin")] + ".pyc")
    out_pyc.parent.mkdir(parents=True, exist_ok=True)
    data = mb.read_bytes()
    # 先直接跑 walker 拿到具体错误
    try:
        w = Walker(data, game2std, game_cache, binop_arg_map)
        new_marshal = w.walk()
        pyc = PYC_MAGIC_311 + b"\x00" * 12 + new_marshal
        nc = w.codes_translated
        mode = "recursive"
        dbg = f"pos_end={w.pos}/{len(data)} codes={w.codes_translated}"
    except WalkAbort as e:
        nc = 0
        mode = f"ABORT: {e}"
        dbg = f"pos={w.pos}/{len(data)}"
        # fallback
        pyc, nc2, _ok, _unk = translate_recursive(data, game2std, game_cache, binop_arg_map)[:2] + (0,0,0,) if False else (PYC_MAGIC_311 + b"\x00" * 12 + data, 0, 0, 0)
    out_pyc.write_bytes(pyc)
    out_pycs.append((pat, out_pyc, nc, mode))
    print(f"  {pat:80s}\n      mode={mode}  {dbg}", flush=True)

# 反编译验证
print(f"\n=== pycdc decompile ===", flush=True)
if PYCDC is None:
    print("[WARN] no pycdc found; skipping decompile verification")
else:
    for pat, pyc, nc, mode in out_pycs:
        try:
            r = subprocess.run([PYCDC, str(pyc)], capture_output=True, timeout=10)
            text = r.stdout.decode("utf-8", errors="replace")
            lines = text.strip().split("\n") if text.strip() else []
            nonempty = [l for l in lines if l.strip() and not l.startswith("#")]
            print(f"  {pat:80s}  -> {len(nonempty):3d} code lines  ({mode})", flush=True)
            if "Decompyle incomplete" in text or len(nonempty) < 3:
                # show error
                err = r.stderr.decode("utf-8", errors="replace")[:200]
                print(f"      ERR: {err}", flush=True)
        except subprocess.TimeoutExpired:
            print(f"  {pat:80s}  TIMEOUT", flush=True)
