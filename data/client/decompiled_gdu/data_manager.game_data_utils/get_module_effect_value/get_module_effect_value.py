# Source Generated with Decompyle++
# File: get_module_effect_value.pyc (Python 3.11)

config = Tb_cfg_module.get(module_id)
if not config:
    return 0
value = None(module_id, effect_id)
return get_after_system_effect_value(enhancements, None, slot_id, value, effect_id)
