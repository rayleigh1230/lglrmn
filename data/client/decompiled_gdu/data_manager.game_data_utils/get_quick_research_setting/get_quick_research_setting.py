# Source Generated with Decompyle++
# File: get_quick_research_setting.pyc (Python 3.11)

user_stuff_ex = GameDataMgr().get_record(TableID.USER_STUFF_EX, GameDataMgr().user_id)
if user_stuff_ex and UserStuffExField.BP_RESEARCH_QUICK_FINISH_SETTING in user_stuff_ex:
    return user_stuff_ex[UserStuffExField.BP_RESEARCH_QUICK_FINISH_SETTING] == UserStuffExField.BpResearchQuickFinishSetting.BP_RESEARCH_QUICK_FINISH_SETTING_YES
