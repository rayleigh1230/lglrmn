# Source Generated with Decompyle++
# File: get_speedup_add_speed.pyc (Python 3.11)

ex_speedup = 0
res_record = GameDataMgr().get_record(TableID.USER_RES, GameDataMgr().user_id)
if res_record:
    ex_speedup = res_record[UserResField.SPEEDUP_EXTRA]
speedup_add = configdata.SPEEDUP_ADD_SPEED + ex_speedup
robot_utils = robot_utils
import ui.efficiency_robot_module
if robot_utils.has_robot_function():
    buff = robot_utils.get_efficiency_buff(CfgEfficiencyRobotEffectField.EffectType.EFFECT_TYPE_RES_REDUCE, CfgEfficiencyRobotEffectField.EffectSubTypeRes.EFFECT_SUB_TYPE_RES_SPEEDUP_CAP)
    if buff:
        params = parse_cfg_str_to_list(buff[UserEfficiencyRobotBuffField.EFFECT_PARAM])
        if len(params) > 3:
            effect_params = params[3]
            percent = (100 - float(effect_params)) / 100
            speedup_add = speedup_add * percent
return speedup_add
