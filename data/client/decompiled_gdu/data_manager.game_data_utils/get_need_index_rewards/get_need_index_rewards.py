# Source Generated with Decompyle++
# File: get_need_index_rewards.pyc (Python 3.11)

need_index_reward = []
all_res_def_data = Tb_cfg_res_def.get_all_data()
for res_id, res_data in six.iteritems(all_res_def_data):
    if res_id < 100:
        res_priority = res_data[Tb_cfg_res_def.PRIORITY]
        need_index = res_data[Tb_cfg_res_def.NEED_INDEX]
        if res_priority > 0 and need_index == 1:
            need_index_reward.append(res_id)
    return need_index_reward
