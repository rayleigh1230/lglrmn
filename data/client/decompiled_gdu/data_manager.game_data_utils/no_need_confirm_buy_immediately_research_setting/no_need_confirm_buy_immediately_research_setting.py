# Source Generated with Decompyle++
# File: no_need_confirm_buy_immediately_research_setting.pyc (Python 3.11)

user_cfg_record = GameDataMgr().get_record(TableID.USER_CONFIGURATION, GameDataMgr().user_id)
if user_cfg_record:
    return bool(user_cfg_record[UserConfigurationField.TODAY_QUICK_OPEN_PACK])
