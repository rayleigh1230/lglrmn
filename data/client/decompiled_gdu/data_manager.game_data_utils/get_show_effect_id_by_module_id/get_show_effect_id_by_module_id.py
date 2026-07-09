# Source Generated with Decompyle++
# File: get_show_effect_id_by_module_id.pyc (Python 3.11)

effect_id_list = []
config = Tb_cfg_module.get(module_id)
if config:
    attr_type = config[Tb_cfg_module.MODULE_TYPE_ATTR]
    if attr_type in MODULE_ATTR_CFG_KEY4_DATA:
        key4_list = MODULE_ATTR_CFG_KEY4_DATA[attr_type]
        for _attr in key4_list:
            for config in list(cfg_attribute_def.get_all_data().values()):
                if not is_valid_key4_config(config, module_id):
                    continue
                if config[cfg_attribute_def.KEY] == _attr:
                    effect_id = config[cfg_attribute_def.EFFECT_ID]
                    if effect_id:
                        effect_id_list.append(effect_id)
                return effect_id_list
