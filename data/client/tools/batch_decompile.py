"""批量调用 pycdc 反编译所有 .pyc 文件。

用法：
  IN_PYC_DIR=~/dumped/modules_all_translated \
  OUT_PY_DIR=~/dumped/modules_all_decompiled \
  PYCDC=~/pycdc/build/pycdc \
  python3 batch_decompile.py
"""
import os, sys, subprocess
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing as mp

IN_PYC_DIR = Path(os.environ.get("IN_PYC_DIR", "/mnt/e/星际猎人/dumped/modules_all_translated"))
OUT_PY_DIR = Path(os.environ.get("OUT_PY_DIR", "/mnt/e/星际猎人/dumped/modules_all_decompiled"))
PYCDC = os.environ.get("PYCDC", os.path.expanduser("~/pycdc/build/pycdc"))


_G = None


def _init(pycdc, in_dir, out_dir):
    global _G
    _G = (pycdc, in_dir, out_dir)


def _decompile_one(pyc_path_str):
    pycdc, in_dir, out_dir = _G
    p = Path(pyc_path_str)
    rel = p.relative_to(in_dir)
    out_py = out_dir / rel.parent / (rel.name[:-len(".pyc")] + ".py")
    out_py.parent.mkdir(parents=True, exist_ok=True)
    try:
        result = subprocess.run([pycdc, str(p)], capture_output=True, timeout=10)
        out_py.write_bytes(result.stdout)
        if result.returncode == 0 and result.stdout:
            return ("ok", len(result.stdout))
        else:
            return ("empty", 0)
    except subprocess.TimeoutExpired:
        return ("timeout", 0)
    except Exception as e:
        return ("err", 0)


def main():
    files = [str(p) for p in IN_PYC_DIR.rglob("*.pyc")]
    print(f"[info] total .pyc: {len(files)}", file=sys.stderr)
    OUT_PY_DIR.mkdir(parents=True, exist_ok=True)
    ncpu = mp.cpu_count()
    print(f"[info] using {ncpu} workers, pycdc={PYCDC}", file=sys.stderr)

    counts = {"ok": 0, "empty": 0, "timeout": 0, "err": 0}
    total_size = 0
    done = 0
    with ProcessPoolExecutor(ncpu, initializer=_init, initargs=(PYCDC, IN_PYC_DIR, OUT_PY_DIR)) as ex:
        for r in ex.map(_decompile_one, files, chunksize=200):
            counts[r[0]] += 1
            total_size += r[1]
            done += 1
            if done % 5000 == 0:
                print(f"  progress: {done}/{len(files)}  ok={counts['ok']} empty={counts['empty']} timeout={counts['timeout']} err={counts['err']}", file=sys.stderr, flush=True)

    print(f"\nDone. total={len(files)}", file=sys.stderr)
    print(f"  ok (non-empty output): {counts['ok']}", file=sys.stderr)
    print(f"  empty (pycdc produced nothing): {counts['empty']}", file=sys.stderr)
    print(f"  timeout: {counts['timeout']}", file=sys.stderr)
    print(f"  err: {counts['err']}", file=sys.stderr)
    print(f"  total output bytes: {total_size:,}", file=sys.stderr)


if __name__ == "__main__":
    main()
