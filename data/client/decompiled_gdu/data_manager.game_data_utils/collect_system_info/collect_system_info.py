# Source Generated with Decompyle++
# File: collect_system_info.pyc (Python 3.11)

get_enhance_effect_id = get_enhance_effect_id
get_enhancement_max_level = get_enhancement_max_level
is_enhance_influence_effect_value = is_enhance_influence_effect_value
import common.blueprint_utils
if not is_enhance_influence_effect_value(_enhance_id):
    return []
system_effect_id_lst = None[get_enhance_effect_id(_enhance_id)]
max_level = get_enhancement_max_level(_enhance_id)
ret = []
for system_effect_id in system_effect_id_lst:
    effect_config = Tb_cfg_system_effect.get(system_effect_id)
    ret.append(EffectInfo(system_id = _system_id_, effect_record = effect_config, cur_level = min(_cur_level, max_level), max_level = max_level, is_system_effect = True, system_effect_id = system_effect_id))
    return ret
