import subprocess, sys
OUT = r"E:\星际猎人\probe_result.txt"
with open(OUT,"w",encoding="utf-8") as f:
    try:
        subprocess.run([sys.executable, r"E:\星际猎人\dump_report_data.py"], stdout=f, stderr=subprocess.STDOUT, timeout=55)
    except Exception as e:
        f.write(f"\n[err: {e}]\n")
