# Source Generated with Decompyle++
# File: get_strategic_rewards_preview.pyc (Python 3.11)

ProtocolMode = ProtocolMode
import ui.battle_pass_view
order_reward = get_reward_order()
need_name_reward = get_need_name_rewards()
reward_data = []
show_num_rewards = { }
select_reward = []
all_activation_data = Tb_cfg_user_activation.get_all_data()
for level, activation_item in six.iteritems(all_activation_data):
    str_cfg = get_user_activation_awards_battlepass(activation_item)
    awards_battlepass = parse_cfg_str_to_dict_of_list(str_cfg, True)
    is_select_reward_item = is_battle_pass_select_reward(activation_item, ProtocolMode.Strategic)
    res_type = list(awards_battlepass.keys())[0] if not is_select_reward_item else CfgResDefField.ResId.RES_ID_BATTLE_PASS_SELECT_REWARD
    if not res_type in need_name_reward and is_select_reward_item:
        is_add = False
        for idx in range(len(reward_data)):
            item_data = reward_data[idx]
            if res_type == list(item_data.keys())[0]:
                if res_type != CfgResDefField.ResId.RES_ID_BP_TECHNICAL:
                    if awards_battlepass[res_type] == list(item_data.values())[0][0]:
                        is_add = True
                    continue
                if awards_battlepass[res_type][1] == list(item_data.values())[0][0]:
                    True = None
            if not is_add:
                if res_type == CfgResDefField.ResId.RES_ID_CONSUME_ITEM:
                    reward_data.append({
                        res_type: [
                            awards_battlepass[res_type][1],
                            awards_battlepass[res_type][0]] })
                    continue
                if res_type != CfgResDefField.ResId.RES_ID_BP_TECHNICAL:
                    reward_data.append({
                        res_type: [
                            awards_battlepass[res_type],
                            1] })
                    continue
                reward_data.append({
                    res_type: [
                        awards_battlepass[res_type][1],
                        awards_battlepass[res_type][0]] })
        continue
    if res_type in list(show_num_rewards.keys()):
        continue
    if is_select_reward_item:
        parse_cfg_str_to_list_of_list(str_cfg, True) = None
        select_reward.append(awards_battlepass_list)
        continue
    show_num_rewards[res_type] = awards_battlepass[res_type]
    for resID, num in six.iteritems(show_num_rewards):
        reward_data.append({
            resID: num })
        if select_reward:
            reward_data.append({
                CfgResDefField.ResId.RES_ID_BATTLE_PASS_SELECT_REWARD: [
                    select_reward,
                    len(select_reward)] })
reward_type = { }
for idx, item in enumerate(reward_data):
    reward_type[idx] = list(reward_data[idx].keys())[0]
    order_reward_type = None(None, key = (lambda item = None: order_reward.index(item[1])))
    order_rewards = []
    for idx in range(len(reward_data)):
        data_idx = order_reward_type[idx][0]
        reward_item = reward_data[data_idx]
        order_rewards.append(reward_item)
        rewards = range(0, len(order_rewards), row_per_num)()
        return rewards
