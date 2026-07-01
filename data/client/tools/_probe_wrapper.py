import subprocess, sys
OUT = r"D:\无尽的拉格朗日\probe_result.txt"
with open(OUT,"w",encoding="utf-8") as f:
    try:
        subprocess.run([sys.executable, r"D:\无尽的拉格朗日\dump_report_data.py"], stdout=f, stderr=subprocess.STDOUT, timeout=55)
    except Exception as e:
        f.write(f"\n[err: {e}]\n")
