# Source Generated with Decompyle++
# File: collect_system_effect_list.pyc (Python 3.11)

all_system_effect_list = []

def collect_module_info(_module_info = None):
    '''
\t\textract module info to all_system_effect_list
\t\t'''
    _module_id = _module_info[0]
    _slot_id = _module_info[1]
    _system_id = _slot_id / CfgShipField.Prefix.PREFIX_SYSTEM_ID_TO_SLOT
    for effect_config in BLUEPRINT_MODULE_EFFECT.get(_module_id, []):
        all_system_effect_list.append(EffectInfo(system_id = _system_id, effect_record = effect_config, cur_level = 1, max_level = 1, is_system_effect = False))
        return None

if cur_enhance_str:
    parse_enhance_data = parse_enhance_data
    import common.blueprint_utils
    cur_enhance_data = parse_enhance_data(cur_enhance_str, include_replace_enhance = False, include_lock_enhance_adjust = False, include_re_extend = include_re_extend)
    for _system_id, cur_system_enhance_dict in six.iteritems(cur_enhance_data):
        if valid_system_list and _system_id not in valid_system_list:
            continue
        for enhance_id, cur_level in six.iteritems(cur_system_enhance_dict):
            all_system_effect_list += collect_system_info_with_cache(_system_id, enhance_id, cur_level)
            if modules:
                for module_info in modules:
                    collect_module_info(module_info)
                    return all_system_effect_list
