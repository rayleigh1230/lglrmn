"""
res_*.npk 离线探测工具 (阶段0.1)

目的: 判定 res_*.npk (贴图/图标资源包) 的数据体是否加密。
  - 若大量 PNG/PVR/DDS 明文魔数 → 未加密, 可离线切片提取, 无需 frida。
  - 若全是加密头 (如 108c15c6...) → 需走 frida 运行时解密 (阶段0.2)。

复用 npk_slicer.parse_npk 的 NXPK 格式 (与 script.npk 相同头结构)。

只读探测, 不修改任何文件。
"""
import struct
import os
import sys
import collections

GAME_DIR = r"E:\星际猎人"

# 已知的明文魔数
def detect_magic(head: bytes) -> str:
    if head[:4] == b'\x89PNG':
        return 'PNG'
    if head[:4] == b'PVR!' or head[:4] == b'\x35RVP' or head[:8] == b'PVR\x03\x00\x00\x00\x00':
        return 'PVR'
    if head[:4] == b'DDS ':
        return 'DDS'
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        return 'WEBP'
    if head[:2] == b'\xff\xd8':
        return 'JPEG'
    if head[:4] == b'\x10\x8c\x15\xc6':
        return 'ENCRYPTED(108c15c6)'  # script.npk 的 NXZ 加密头特征
    if head[:2] == b'\x78\x9c' or head[:2] == b'\x78\x01' or head[:2] == b'\x78\xda':
        return 'ZLIB'
    if head[:4] == b'OGGS':
        return 'OGG'
    if head[:4] == b'\x1a\x45\xdf\xa3':
        return 'WEBM/MKV'
    # 常见加密/未知
    return 'OTHER:' + head[:4].hex()


def parse_npk(path):
    """解析 NXPK 头 + 索引表 (与 npk_slicer.parse_npk 一致)"""
    with open(path, 'rb') as f:
        magic = f.read(4)
        if magic != b'NXPK':
            return None, f"非NXPK格式: {magic}"
        filecount = struct.unpack('<I', f.read(4))[0]
        f.read(12)  # reserved
        index_offset = struct.unpack('<I', f.read(4))[0]
        f.seek(index_offset)
        entries = []
        for _ in range(filecount):
            rec = struct.unpack('<7I', f.read(28))
            entries.append({
                'sign': rec[0], 'offset': rec[1], 'length': rec[2],
                'origlen': rec[3], 'zcrc': rec[4], 'crc': rec[5], 'flag': rec[6]
            })
        return f, entries  # 返回打开的文件句柄供后续读取


def probe_archive(npk_path):
    """扫描整个 NPK, 统计各魔数类型分布"""
    name = os.path.basename(npk_path)
    if not os.path.exists(npk_path):
        print(f"[{name}] 文件不存在, 跳过")
        return None

    f, entries = parse_npk(npk_path)
    if entries is None:
        print(f"[{name}] {f}")
        return None

    magic_counts = collections.Counter()
    flag_counts = collections.Counter()
    png_samples = []
    other_samples = []
    encrypted_samples = []
    total = len(entries)

    with open(npk_path, 'rb') as ff:
        for e in entries:
            ff.seek(e['offset'])
            head = ff.read(8)
            tag = detect_magic(head)
            magic_counts[tag] += 1
            flag_counts[e['flag']] += 1
            if tag == 'PNG' and len(png_samples) < 3:
                png_samples.append((e['length'], e['origlen'], e['sign']))
            elif tag == 'ENCRYPTED(108c15c6)' and len(encrypted_samples) < 3:
                encrypted_samples.append((e['length'], e['origlen'], e['sign']))
            elif tag.startswith('OTHER') and len(other_samples) < 5:
                other_samples.append((e['length'], head[:8].hex(), e['sign']))

    plaintext = magic_counts['PNG'] + magic_counts['PVR'] + magic_counts['DDS'] + magic_counts['WEBP'] + magic_counts['JPEG'] + magic_counts['ZLIB']
    encrypted = magic_counts['ENCRYPTED(108c15c6)']
    verdict = '明文为主' if plaintext > encrypted else ('加密为主' if encrypted > plaintext else '混合')

    print(f"\n{'='*60}")
    print(f"[{name}] 总条目: {total}")
    print(f"  判定: {verdict} (明文纹理类 {plaintext}, 加密NXZ {encrypted})")
    print(f"  魔数分布 Top12:")
    for k, v in magic_counts.most_common(12):
        pct = 100.0 * v / total if total else 0
        print(f"    {k:28s} {v:>7d}  ({pct:5.1f}%)")
    print(f"  flag分布: {dict(flag_counts.most_common(8))}")
    if png_samples:
        print(f"  PNG样例(len,origlen,sign): {png_samples}")
    if encrypted_samples:
        print(f"  加密样例(len,origlen,sign): {encrypted_samples}")
    if other_samples:
        print(f"  其他魔数样例(len,head8,sign): {other_samples}")
    return {'total': total, 'magic': dict(magic_counts), 'flags': dict(flag_counts), 'verdict': verdict}


if __name__ == "__main__":
    print("="*60)
    print("res_*.npk 离线加密状态探测 (阶段0.1)")
    print("="*60)

    # 列出所有 res_*.npk
    res_files = sorted([f for f in os.listdir(GAME_DIR)
                        if f.startswith('res_') and f.endswith('.npk')])
    print(f"发现 {len(res_files)} 个 res_*.npk: {res_files}")

    results = {}
    for rf in res_files:
        results[rf] = probe_archive(os.path.join(GAME_DIR, rf))

    # 汇总
    print(f"\n{'='*60}")
    print("汇总:")
    print("="*60)
    for rf, r in results.items():
        if r:
            print(f"  {rf:16s} 条目={r['total']:>6d}  判定={r['verdict']}")

    # 关键判断
    print(f"\n结论:")
    all_plaintext = all(r and not r['verdict'].startswith('加密') for r in results.values() if r)
    any_encrypted = any(r and r['verdict'].startswith('加密') for r in results.values() if r)
    if all_plaintext:
        print("  ✅ 所有 res_*.npk 以明文为主 → 可直接离线切片提取图标, 无需 frida")
    elif any_encrypted:
        print("  ⚠️  存在加密的 res_*.npk → 需走 frida 运行时解密路径 (阶段0.2)")
    else:
        print("  ❓ 结果不明确, 需人工检查魔数分布")
