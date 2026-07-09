# Source Generated with Decompyle++
# File: get_special_rewards.pyc (Python 3.11)

sp_rewards = [
    CfgResDefField.ResId.RES_ID_BP_POOL]
all_res_def_data = Tb_cfg_res_def.get_all_data()
for res_id, res_data in six.iteritems(all_res_def_data):
    if res_id < 100:
        show_sp = res_data[Tb_cfg_res_def.SHOW_SPECIAL]
        if show_sp == 1:
            sp_rewards.append(res_id)
    return sp_rewards
