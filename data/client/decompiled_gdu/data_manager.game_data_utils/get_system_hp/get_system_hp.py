# Source Generated with Decompyle++
# File: get_system_hp.pyc (Python 3.11)

attr_type = common_definition.MA_SYSTEM_HP
system_config = Tb_cfg_ship_system.get(system_id)
if not system_config:
    return 0
hp = None[Tb_cfg_ship_system.HP]
return int(get_after_system_effect_value(enhancements, system_id, None, hp, attr_type, include_re_extend = include_re_extend))
