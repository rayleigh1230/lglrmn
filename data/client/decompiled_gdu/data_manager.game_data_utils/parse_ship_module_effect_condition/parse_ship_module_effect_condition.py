# Source Generated with Decompyle++
# File: parse_ship_module_effect_condition.pyc (Python 3.11)

if is_cache:
    cache = data_utils.g_parse_cfg_cache.get_data_from_cache(data_str, ParseCfgCache.parse_ship_module_effect_condition)
    if cache:
        return cache
    data_map = None
    dict_list = parse_cfg_str_to_dict_of_list(data_str, is_cache)
    for key, val_list in six.iteritems(dict_list):
        data_map[int(key)] = []
        for i in range(3):
            data_list = split_str(val_list[i], '|', True) if i < len(val_list) else []
            data_map[int(key)].append(data_list)
            if is_cache:
                data_utils.g_parse_cfg_cache.add_data_to_cache(data_str, data_map, ParseCfgCache.parse_ship_module_effect_condition)
return data_map
