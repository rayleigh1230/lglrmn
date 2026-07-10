"""Analyze encoding patterns in data_manager marshal files."""
import marshal
from pathlib import Path
from collections import Counter

GDU_RAW = Path(r"E:\战斗模拟器\dumped\gdu_raw\data_manager.game_data_utils")
marshal_files = list(GDU_RAW.glob("*/*.marshal.bin"))

all_byte_values = Counter()
all_args = Counter()
total_instructions = 0

for idx, mf in enumerate(marshal_files[:50]):
    try:
        co = marshal.loads(mf.read_bytes())
    except Exception as e:
        print(f"  SKIP {mf.name}: {e}")
        continue
    code = co.co_code
    for i in range(0, len(code), 2):
        gb = code[i]
        arg = code[i+1] if i+1 < len(code) else 0
        all_byte_values[gb] += 1
        all_args[(gb, arg)] += 1
        total_instructions += 1
    if (idx + 1) % 20 == 0:
        print(f"  Processed {idx+1}/50...")

print(f"Total instruction slots (including cache): {total_instructions}")
print(f"Unique byte values: {len(all_byte_values)}")
print(f"Byte value distribution:")
for b, c in all_byte_values.most_common(20):
    print(f"  byte {b:3d}: {c:6d} ({c/total_instructions*100:.1f}%)")

print()
print("Top byte 0 + arg combinations:")
byte0_args = [(arg, c) for (gb, arg), c in all_args.items() if gb == 0]
for arg, c in sorted(byte0_args, key=lambda x: -x[1])[:15]:
    print(f"  byte=0, arg={arg:3d}: {c:6d}")
