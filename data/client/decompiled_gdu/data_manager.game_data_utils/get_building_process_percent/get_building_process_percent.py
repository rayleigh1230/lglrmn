# Source Generated with Decompyle++
# File: get_building_process_percent.pyc (Python 3.11)

if not building_record:
    return 0
cfg_id = None(building_record)
cfg_record = Tb_cfg_world_item.get(cfg_id)
if cfg_record:
    total_build_time = get_building_time_cost(cfg_id)
    remaining_build_time = building_record[WorldItemField.REMAINING_BUILD_TIME]
    end_time = building_record[WorldItemField.END_TIME]
    begin_time = building_record[WorldItemField.BEGIN_TIME]
    now_time = time_utils.get_server_time()
    total_remain_percent = remaining_build_time * 1 / total_build_time
    current_remain_percent = max(end_time - now_time, 0) / max(end_time - begin_time, 1)
    build_percent = 1 - total_remain_percent * current_remain_percent
    return build_percent * 100
