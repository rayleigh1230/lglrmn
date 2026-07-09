# Source Generated with Decompyle++
# File: get_system_bg.pyc (Python 3.11)

ship_utils = ship_utils
import common
cfg_module_attr = cfg_module_attr
import common.config.client_cfg
module_id = ship_utils.get_system_main_module_id(system_id)
cfg_module = Tb_cfg_module.get(module_id)
module_type_id = cfg_module[Tb_cfg_module.MODULE_TYPE_ATTR]
module_attr = cfg_module_attr.get(module_type_id)
icon_name = module_attr[cfg_module_attr.ICON]
if icon_name in ('icon_system_type_battle',):
    return ui_res.ICON_SYSTEM_BG_TYPE_ATTACK
return None.ICON_SYSTEM_BG_TYPE_NO_ATTACK
