# Source Generated with Decompyle++
# File: get_expanding_process_percent.pyc (Python 3.11)

if building_record or building_record[WorldItemField.USERID] != GameDataMgr().user_id:
    return 0
if not None(building_record):
    return 100
cfg_id = None(building_record)
cfg_record = Tb_cfg_world_item.get(cfg_id)
if cfg_record:
    total_expand_time = TEAM_SUP_UNFOLD_DURATION
    unfold_record = GameDataMgr().get_record(TableID.TEAM_SUP_UNFOLD, building_record[WorldItemField.UNFOLD_TEAM_SUP_ID])
    progress = unfold_record[TeamSupUnfoldField.ACTION_PROGRESS]
    end_time = unfold_record[TeamSupUnfoldField.ACTION_EXPECT_END_TIME]
    now_time = time_utils.get_server_time()
    total_remain_percent = (max(end_time - now_time, 0) + progress) / total_expand_time
    expand_percent = 1 - total_remain_percent
    return expand_percent * 100
