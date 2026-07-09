# Source Generated with Decompyle++
# File: get_reward_by_roulette_id.pyc (Python 3.11)

rst = []
if not roulette_id:
    return rst
if None(roulette_id, int):
    roulette_id = [
        roulette_id]
elif isinstance(roulette_id, str):
    roulette_id = parse_cfg_str_to_list(roulette_id, is_num = True, default = [])
goods_set = set()
for _id in roulette_id:
    roulette_cfg = Tb_cfg_reward_roulette.get(_id)
    if not roulette_cfg:
        continue
    goods_lst = parse_cfg_str_to_list_of_list(roulette_cfg[Tb_cfg_reward_roulette.ITEMS], is_num = True)
    for obj in goods_lst:
        res_type = obj[0]
        if res_type == CfgResDefField.ResId.RES_ID_ASSET_PACK:
            res_id = obj[1]
            goods_set.add((res_type, res_id))
            continue
        if len(obj) < 3:
            continue
        (res_type, num, res_id) = obj
        if res_type == CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK_SP:
            res_id = get_bp_research_tree_pack_sp_disguise_id(res_id)
        if merge_types and res_type in merge_types:
            goods_set.add((res_type, None))
            continue
        goods_set.add((res_type, res_id))
        if not goods_set:
            return rst
        res_image_config = res_image_config
        import common.config
        res_set = set()
        for res_type, res_id in goods_set:
            if res_id:
                icon = ResInfo.get_res_icon(res_type)
                name = ResInfo.get_res_icon_name(res_type)
            else:
                res_info = res_image_config.find_res_info(res_type, res_id)
                icon = ResInfo.get_res_icon(res_type)
                name = res_info.get('name', '')
            res_set.add((res_type, res_id, icon, name))
            res_lst = list(res_set)
            order_priority = get_reward_priority()
            None(key = (lambda x = None: order_priority.get(x[0], 999999)))
            for res_type, res_id, icon, name in res_lst:
                rst.append({
                    'res_type': res_type,
                    'res_id': res_id,
                    'icon': icon,
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
