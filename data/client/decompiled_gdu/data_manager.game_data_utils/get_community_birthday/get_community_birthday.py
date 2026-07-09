# Source Generated with Decompyle++
# File: get_community_birthday.pyc (Python 3.11)

if not common_config.is_enable_community():
    return 0
if None:
    return 0
record = None().get_record(TableID.USER_STUFF_EX, GameDataMgr().user_id)
if record:
    return record[UserStuffExField.UNISDK_BIRTHDAY]
