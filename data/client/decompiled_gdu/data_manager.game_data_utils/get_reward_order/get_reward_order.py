# Source Generated with Decompyle++
# File: get_reward_order.pyc (Python 3.11)

res_data_list = []
all_res_def_data = Tb_cfg_res_def.get_all_data()
res_data_list.append([
    CfgResDefField.ResId.RES_ID_CLIENT_ICON,
    100])
res_data_list.append([
    CfgResDefField.ResId.RES_ID_SPECIFIC_ARCHIVES,
    100])
res_data_list.append([
    CfgResDefField.ResId.RES_ID_COLLECTION_ITEM_LIMIT,
    100])
res_data_list.append([
    CfgResDefField.ResId.RES_ID_PAPER_BOOK,
    100])
res_data_list.append([
    CfgResDefField.ResId.RES_ID_TITLE_TIME_LIMIT,
    100])
res_data_list.append([
    CfgResDefField.ResId.RES_ID_WEAPON_TECH_PACK,
    100])
res_data_list.append([
    CfgResDefField.ResId.RES_ID_BATTLE_PASS_SELECT_REWARD,
    100])
for res_id, res_data in six.iteritems(all_res_def_data):
    res_priority = res_data[Tb_cfg_res_def.PRIORITY]
    if res_priority > 0:
        res_data_list.append([
            res_id,
            res_priority])
    res_data_list.sort(key = (lambda item: item[1]))
    order_rewards = res_data_list()
    return order_rewards
