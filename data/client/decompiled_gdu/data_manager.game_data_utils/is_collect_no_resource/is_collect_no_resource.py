# Source Generated with Decompyle++
# File: is_collect_no_resource.pyc (Python 3.11)

if not world_item_info:
    return False
ruin_data = None(world_item_info[14], is_num = True)
left_res_percent = ruin_data[0]
return left_res_percent <= 0
