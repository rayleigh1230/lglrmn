"""快速诊断：找出所有递归翻译 fallback 的文件。"""
import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from translate_recursive_v2 import load_mappings, Walker, WalkAbort, PYC_MAGIC_311

IN_DIR = Path(os.environ.get("IN_DIR", r"E:\星际猎人\dumped\modules_all"))

game2std, game_cache, binop_arg_map = load_mappings()

fallback_files = []
fail_files = []
done = 0
for mb in IN_DIR.rglob("*.marshal.bin"):
    done += 1
    rel = mb.relative_to(IN_DIR)
    try:
        data = mb.read_bytes()
        try:
            w = Walker(data, game2std, game_cache, binop_arg_map)
            new_marshal = w.walk()
            if w.codes_translated == 0:
                fallback_files.append((str(rel), "codes=0", w.pos, len(data)))
        except WalkAbort as e:
            fallback_files.append((str(rel), f"abort:{e}", w.pos, len(data)))
        except Exception as e:
            fail_files.append((str(rel), f"{type(e).__name__}:{e}"))
    except Exception as e:
        fail_files.append((str(rel), f"read:{e}"))
    if done % 20000 == 0:
        print(f"  scanned {done}...", file=sys.stderr, flush=True)

print(f"\n=== Fallback ({len(fallback_files)}) ===", file=sys.stderr)
for f in fallback_files[:30]:
    print(f"  {f}", file=sys.stderr)
print(f"\n=== Fail ({len(fail_files)}) ===", file=sys.stderr)
for f in fail_files:
    print(f"  {f}", file=sys.stderr)
