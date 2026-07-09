# Source Generated with Decompyle++
# File: collect_module_info.pyc (Python 3.11)

_module_id = _module_info[0]
_slot_id = _module_info[1]
_system_id = _slot_id / CfgShipField.Prefix.PREFIX_SYSTEM_ID_TO_SLOT
for effect_config in BLUEPRINT_MODULE_EFFECT.get(_module_id, []):
    all_system_effect_list.append(EffectInfo(system_id = _system_id, effect_record = effect_config, cur_level = 1, max_level = 1, is_system_effect = False))
    return None
