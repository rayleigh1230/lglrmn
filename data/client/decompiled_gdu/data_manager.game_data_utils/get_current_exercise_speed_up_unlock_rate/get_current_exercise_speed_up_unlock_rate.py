# Source Generated with Decompyle++
# File: get_current_exercise_speed_up_unlock_rate.pyc (Python 3.11)

level_exercise_utils = level_exercise_utils
import ui.military_drill_view
complete_level_ids = level_exercise_utils.get_user_complete_level_ids(True)
unlock_rate = Tb_cfg_battle_rate_unlock.get_all_data()
cfg_list = []
for level_id, cfg in six.iteritems(unlock_rate):
    if npc_exercise_type and cfg[Tb_cfg_battle_rate_unlock.NPC_EXERCISE_TYPE] != npc_exercise_type:
        continue
    cfg_list.append((level_id, cfg[Tb_cfg_battle_rate_unlock.RATE]))
    cfg_list.sort(key = (lambda x: x[1]), reverse = True)
    for level_id, rate in cfg_list:
        if level_id in complete_level_ids:
            
            return None, rate
        return 1
