# Source Generated with Decompyle++
# File: get_newbie_drill_res_add_speed_dic.pyc (Python 3.11)

(drill_res_info, _) = get_newbie_drill_info()
drill_res_speed_info = {
    CfgResDefField.ResId.RES_ID_DEUTERIUM: 0,
    CfgResDefField.ResId.RES_ID_CRYSTAL: 0,
    CfgResDefField.ResId.RES_ID_METAL: 0 }
for key in drill_res_speed_info:
    if key in drill_res_info:
        drill_res_speed_info[key] = drill_res_info[key][1]
    return drill_res_speed_info
