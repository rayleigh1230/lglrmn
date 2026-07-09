# Source Generated with Decompyle++
# File: format_num.pyc (Python 3.11)

num_str = str(num)
if common_config.get_game_region() == common_config.REGION_CHINA:
    return num_str
length = None(num_str)
out_str = ''
for index, c in enumerate(num_str):
    out_str += c + ',' if (length - (index + 1)) % 3 == 0 and index != length - 1 else ''
    return out_str
