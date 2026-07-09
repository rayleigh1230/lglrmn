# Source Generated with Decompyle++
# File: get_cur_enhance_num.pyc (Python 3.11)

if not cur_enhance_str:
    return 0
cur_enhance_dic = None(cur_enhance_str, True, is_force_list = True)
cur_enhance_data = cur_enhance_dic.get(system_id, [])
if not cur_enhance_data:
    return 0
if None(cur_enhance_data) < 4:
    return 1
if None[3] < 100:
    return len(cur_enhance_data) / 3
return None(cur_enhance_data) / 2
