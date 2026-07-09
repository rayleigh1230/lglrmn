# Source Generated with Decompyle++
# File: get_exercise_speed_up_rate_dict.pyc (Python 3.11)

unlock_rate = Tb_cfg_battle_rate_unlock.get_all_data()
cfg_dict = { }
for level_id, cfg in six.iteritems(unlock_rate):
    if npc_exercise_type and cfg[Tb_cfg_battle_rate_unlock.NPC_EXERCISE_TYPE] != npc_exercise_type:
        continue
    record = Tb_cfg_level_exercise.get(level_id)
    if record:
        cfg_dict[cfg[Tb_cfg_battle_rate_unlock.RATE]] = record[Tb_cfg_level_exercise.NAME]
    return cfg_dict
