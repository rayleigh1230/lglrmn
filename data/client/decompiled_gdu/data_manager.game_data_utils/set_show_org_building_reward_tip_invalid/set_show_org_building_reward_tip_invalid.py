# Source Generated with Decompyle++
# File: set_show_org_building_reward_tip_invalid.pyc (Python 3.11)

last_info_str = user_default.get_user_default_for_key(user_default.USER_DEFAULT_FOR_STRING, common_config.ORG_FACILITY_REWARD_TIP)
if last_info_str:
    last_info_dict = json.loads(last_info_str)
    for cfg_item_id, info in six.iteritems(last_info_dict):
        if info[1] == 1:
            info[1] = 2
        info_str = json.dumps(last_info_dict)
        user_default.set_user_default_for_key(user_default.USER_DEFAULT_FOR_STRING, common_config.ORG_FACILITY_REWARD_TIP, info_str)
        return None
        return None
