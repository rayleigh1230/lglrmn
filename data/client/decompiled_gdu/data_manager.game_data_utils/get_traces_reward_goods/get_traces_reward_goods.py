# Source Generated with Decompyle++
# File: get_traces_reward_goods.pyc (Python 3.11)

cfg_traces = get_traces_reward_cfg_by_item_id(item_id)
if not cfg_traces:
    return []
reward_data = None(cfg_traces[Tb_cfg_traces_reward.REWARD_ID], is_num = True)
reward_id = reward_data[0][1]
return get_reward_by_traces_reward_id(reward_id, filter_same_name_goods = filter_same_name_goods)
