# Source Generated with Decompyle++
# File: is_valid_key4_config.pyc (Python 3.11)

effect_id = config[cfg_attribute_def.EFFECT_ID]
if not effect_id:
    return True
for cfg_module_effect_config in None.get(module_id, []):
    if cfg_module_effect_config[Tb_cfg_module_effect.EFFECT_ID] == effect_id:
        return True
    return False
