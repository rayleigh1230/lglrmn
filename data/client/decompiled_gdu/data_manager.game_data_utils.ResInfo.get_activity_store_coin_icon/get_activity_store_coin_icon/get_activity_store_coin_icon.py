# Source Generated with Decompyle++
# File: get_activity_store_coin_icon.pyc (Python 3.11)

if activity_id or res_id != CfgResDefField.ResId.RES_ID_STORE_SCORE:
    return ResInfo.get_res_icon_reward(res_id)
icon_path = None.ACTIVITY_STORE_COIN_ICON.get(activity_id, ResInfo.ACTIVITY_STORE_COIN_ICON['default'])
return icon_path
