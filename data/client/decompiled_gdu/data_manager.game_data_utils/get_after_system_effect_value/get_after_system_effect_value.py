# Source Generated with Decompyle++
# File: get_after_system_effect_value.pyc (Python 3.11)

if isinstance(base_value, str):
    return base_value
if None:
    invalid_effect_list = []
all_system_effect_list = collect_system_effect_list(cur_enhance_str, modules, valid_system_list, include_re_extend)
skill_effect_ratio = collect_skill_effect_ratio(module_id, dps_type, attr_type)

def check_valid_after_system_effect_info(_effect_record = None, _system_id = None, _invalid_effect_list = None):
    if _effect_record[Tb_cfg_system_effect.EFFECT_ID] in _invalid_effect_list:
        return False
    return None(system_id, slot_id, _system_id, _effect_record, module_id = module_id, drone_slot_id = drone_slot_id, weapon_action_id = weapon_action_id)

add_base_num = 0
for effect_info in all_system_effect_list:
    if not check_valid_after_system_effect_info(effect_info.effect_record, effect_info.system_id, invalid_effect_list):
        continue
    effect_add = calc_effect_add(effect_info, attr_type)
    if not effect_add.check_enhance_valid():
        continue
    add_base_num += effect_add.add_base_num
    add_num += effect_add.add_num
    add_ratio += effect_add.add_ratio
    ret = (base_value + add_base_num) * (100 + add_ratio + skill_effect_ratio) / 100 + add_num
    return ret
