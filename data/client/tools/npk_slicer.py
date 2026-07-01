"""
NPK切片工具: 从 script.npk 提取指定NXZ文件的原始字节

实测格式 (2026-07-01确认):
  NXPK头(20字节): "NXPK" + filecount(4) + reserved(12) + index_offset(4)
  索引表: filecount * 28字节/条, 每条 = [sign,offset,length,origlen,zcrc,crc,flag]
  文件数据: 按offset/length直接切片 (明文,无需解密)

用途:
  游戏启动后,解密器需要"喂"NXZ字节。本工具负责从NPK切出目标文件。
  重点目标: 战斗相关模块 (battle_command/buff_effect/client_battle_data等)
"""

import struct
import os
import sys

NPK_PATH = r"D:\无尽的拉格朗日\script.npk"

# 战斗/命中/伤害相关的目标模块路径 (优先解密这些)
TARGET_MODULES = [
    "scene_zoom0/battle_command",
    "scene_zoom0/battle_entity",
    "scene_zoom0/battle_ship_group",
    "scene_zoom0/buff_effect",
    "scene_zoom0/weapon",
    "data/battle",
    "data/ship/ship_attribute",
    "data/ship/client_battle_ship_data",
    "data/ship/ship_data",
    "battle_footage",
]

def parse_npk(path):
    """解析NPK,返回索引表"""
    with open(path, 'rb') as f:
        magic = f.read(4)
        assert magic == b'NXPK', f"非NXPK格式: {magic}"
        filecount = struct.unpack('<I', f.read(4))[0]
        f.read(12)  # reserved (var1,var2,var3 全0)
        index_offset = struct.unpack('<I', f.read(4))[0]
        f.seek(index_offset)
        entries = []
        for _ in range(filecount):
            rec = struct.unpack('<7I', f.read(28))
            entries.append({
                'sign': rec[0], 'offset': rec[1], 'length': rec[2],
                'origlen': rec[3], 'zcrc': rec[4], 'crc': rec[5], 'flag': rec[6]
            })
        return entries

def read_file_at(npk_path, offset, length):
    with open(npk_path, 'rb') as f:
        f.seek(offset)
        return f.read(length)

# Documents/script 里有文件路径名(NPK里只有sign hash,需用Documents映射)
DOCS = r"C:\Users\Administrator\AppData\Local\lagrange_online_branch\Documents\script"

def build_sign_to_path():
    """用Documents里的.nxz文件路径 反查 sign->path 映射
    (sign是路径hash,Documents保留了明文路径)"""
    import hashlib
    sign_map = {}
    # 遍历Documents/script
    for root, dirs, files in os.walk(DOCS):
        for fn in files:
            if fn.endswith('.nxz'):
                full = os.path.join(root, fn)
                rel = os.path.relpath(full, DOCS).replace('\\', '/')
                # sign的计算方式未知,但可以用文件大小匹配
                sign_map[full] = (rel, os.path.getsize(full))
    return sign_map

if __name__ == "__main__":
    print("解析 script.npk...")
    entries = parse_npk(NPK_PATH)
    print(f"文件数: {len(entries)}")

    # 索引Documents里的文件(按大小匹配NPK条目)
    print("\n索引Documents文件(建立大小->路径映射)...")
    size_to_paths = {}
    docs_root = DOCS
    for root, dirs, files in os.walk(docs_root):
        for fn in files:
            if fn.endswith('.nxz'):
                full = os.path.join(root, fn)
                sz = os.path.getsize(full)
                size_to_paths.setdefault(sz, []).append(os.path.relpath(full, docs_root).replace('\\', '/'))

    # 匹配目标模块
    print("\n=== 目标战斗模块在NPK中的位置 ===")
    matched = 0
    for i, e in enumerate(entries):
        paths = size_to_paths.get(e['length'], [])
        for p in paths:
            for tgt in TARGET_MODULES:
                if p.startswith(tgt):
                    print(f"  [{i:5d}] {p}  offset={e['offset']} len={e['length']} origlen={e['origlen']} flag={e['flag']:#x}")
                    matched += 1
                    break

    print(f"\n匹配到 {matched} 个目标文件")
    print(f"(NPK共{len(entries)}个文件,Documents缓存可作为路径索引)")
