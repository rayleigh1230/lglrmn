# Source Generated with Decompyle++
# File: get_repairs_overstep_tip.pyc (Python 3.11)

tips = ''
if CfgResDefField.ResId.RES_ID_REPAIR_PARTS in list(res_dic.keys()):
    building_id = get_player_base_building_id()
    (current_repairs, add_repairs, max_repairs) = get_current_repair_parts(building_id, get_extra_info = True)
    if current_repairs + res_dic[CfgResDefField.ResId.RES_ID_REPAIR_PARTS] > max_repairs:
        tips = language.REPAIRS_NUM_OVERSTEP_TIP.format(current_repairs, max_repairs)
return tips
