# Source Generated with Decompyle++
# File: get_system_icon_path_by_module_id.pyc (Python 3.11)

cfg_module_attr = cfg_module_attr
import common.config.client_cfg
cfg_module_info = Tb_cfg_module.get(module_id)
module_type_id = cfg_module_info[Tb_cfg_module.MODULE_TYPE_ATTR]
module_attr = cfg_module_attr.get(module_type_id)
icon_name = module_attr[cfg_module_attr.ICON]
if is_analysis:
    return ui_res.ICON_SYSTEM_TYPE_ANALYSIS.format(icon_name)
if None:
    return ui_res.ICON_SYSTEM_TYPE_L.format(icon_name)
if None:
    return ui_res.ICON_SYSTEM_TYPE_RESEARCH.format(icon_name)
return None.ICON_SYSTEM_TYPE.format(icon_name)
