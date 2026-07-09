# Source Generated with Decompyle++
# File: is_valid_enhance_system.pyc (Python 3.11)

if not system_id:
    return True
if None == CfgModuleEffectField.TargetSystem.TARGET_SYSTEM_ALL:
    return True
if None == CfgModuleEffectField.TargetSystem.TARGET_SYSTEM_SELF and system_id == compare_system_id:
    return True
if None:
    if target_system == CfgModuleEffectField.TargetSystem.TARGET_SYSTEM_MAIN and system_id == compare_system_id:
        system_config = Tb_cfg_ship_system.get(drone_system_id)
        is_main_system = system_config[Tb_cfg_ship_system.MAIN_SYSTEM]
        return is_main_system == CfgModuleEffectField.TargetSystem.TARGET_SYSTEM_SELF
    if None == CfgModuleEffectField.TargetSystem.TARGET_SYSTEM_OTHER and system_id != compare_system_id:
        return True
    return None
system_config = None.get(system_id)
is_main_system = system_config[Tb_cfg_ship_system.MAIN_SYSTEM]
if target_system == CfgModuleEffectField.TargetSystem.TARGET_SYSTEM_MAIN and is_main_system == CfgModuleEffectField.TargetSystem.TARGET_SYSTEM_SELF:
    return True
if None == CfgModuleEffectField.TargetSystem.TARGET_SYSTEM_OTHER and system_id != compare_system_id:
    return True
