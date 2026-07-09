# Source Generated with Decompyle++
# File: add_res_data_to_dict_for_check_exceed.pyc (Python 3.11)

reward_to_args = reward_to_args
import ui.res_info.res_info_assemble
(res_type, res_num, res_id, _) = reward_to_args(reward_data)
if res_type == CfgResDefField.ResId.RES_ID_WEAPON_TECH:
    prev_tech_info = _dict.get(res_type, [
        0,
        0])
    if res_id == prev_tech_info[1] or prev_tech_info[1] == 0:
        _dict[res_type] = [
            res_num + prev_tech_info[0],
            res_id]
        return None
    return None
if None == CfgResDefField.ResId.RES_ID_SHIP:
    data = _dict.get(res_type, [
        0,
        0])
    if res_id == data[0] or data[1] == 0:
        _dict[res_type] = [
            res_id,
            res_num + data[0]]
        return None
    return None
if None == CfgResDefField.ResId.RES_ID_NPC_TEAM_EFFECT:
    data = _dict.get(res_type, [
        0,
        0])
    if res_id == data[1] or data[1] == 0:
        _dict[res_type] = [
            res_num + data[0],
            res_id]
        return None
    return None
num = 0 if not None else res_num
_dict[res_type] = num + _dict.get(res_type, 0)
