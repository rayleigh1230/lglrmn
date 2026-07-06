# -*- coding: utf-8 -*-
"""定时版 hook：setup → poll 持续 N 秒 → restore → dump 到 json 文件后退出。供后台运行。"""
import frida, time, json, sys, datetime

DURATION = 240  # 秒
OUT_FILE = "data/client/tools/_hook_capture.json"

# 复用主脚本的 JS
sys.path.insert(0, "data/client/tools")
_ns = {}
exec(open("data/client/tools/hook_share_code.py", encoding="utf-8").read().split("def main()")[0], _ns)
JS_HOOK = _ns["JS_HOOK"]

def main():
    procs = [p for p in frida.get_local_device().enumerate_processes() if p.name == "infinite_lagrange_cn.exe"]
    if not procs:
        print("NO_GAME"); return
    pid = procs[0].pid
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] attach PID={pid}, 运行 {DURATION}s")
    session = frida.attach(pid)
    script = session.create_script(JS_HOOK)
    script.load()
    r = script.exports_sync.setup()
    print("setup:", r.get("out"))
    if r["rc"] != 0 or (r.get("out") and "SETUP_FAIL" in r["out"]):
        print("安装失败"); session.detach(); return

    captured = []
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] HOOK运行中，去游戏操作（生成/导入分享码）...")
    t0 = time.time()
    while time.time() - t0 < DURATION:
        try:
            r = script.exports_sync.poll()
            if r["rc"] == 0 and r["out"]:
                lines = json.loads(r["out"])
                for ln in lines:
                    print(f"[+{int(time.time()-t0)}s] {ln}")
                    captured.append({"t": int(time.time()-t0), "msg": ln})
        except Exception as e:
            print("poll err:", e)
        time.sleep(0.5)

    try:
        script.exports_sync.restore()
        print("restored")
    except Exception as e:
        print("restore err:", e)
    session.detach()

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(captured, f, ensure_ascii=False, indent=2)
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] 完成，捕获 {len(captured)} 条，写入 {OUT_FILE}")

if __name__ == "__main__":
    main()
