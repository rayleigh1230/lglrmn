# Source Generated with Decompyle++
# File: get_store_goods_replace_item.pyc (Python 3.11)

if sys_param_utils.is_first_season():
    store_goods_replace_str = configdata.SEASON_USER_STORE_GOODS_REPLACE[0]
else:
    store_goods_replace_str = configdata.SEASON_USER_STORE_GOODS_REPLACE[1]
store_goods_replace = parse_cfg_str_to_dict_of_list(store_goods_replace_str, is_num = True)
return store_goods_replace
