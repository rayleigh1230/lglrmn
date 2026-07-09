# Source Generated with Decompyle++
# File: get_reward_by_traces_reward_id.pyc (Python 3.11)

res_image_config = res_image_config
import common.config
reward_drop_utils = reward_drop_utils
import data_manager.res_info.reward_drop
rst = []
reward_merge_list = reward_drop_utils.get_drop_res_merge_list(reward_id)
if not reward_merge_list:
    return rst
for reward in None:
    icon_path = ResInfo.get_res_icon(reward.RES_TYPE)
    if reward.res_id:
        name = ResInfo.get_res_icon_name(reward.RES_TYPE)
    else:
        res_info = res_image_config.find_res_info(reward.RES_TYPE, reward.res_id)
        name = res_info.get('name', '')
    rst.append({
        'res_type': reward.RES_TYPE,
        'res_id': reward.res_id,
        'icon': icon_path,
        'name': name })
    if filter_same_name_goods:
        
        def filter_goods_list_by_name(goods_list):
            name_set = set()
            ret_goods_list = []
            for goods in goods_list:
                if goods['name'] not in name_set:
                    name_set.add(goods['name'])
                    ret_goods_list.append(goods)
                return ret_goods_list

        rst = filter_goods_list_by_name(rst)
return rst
