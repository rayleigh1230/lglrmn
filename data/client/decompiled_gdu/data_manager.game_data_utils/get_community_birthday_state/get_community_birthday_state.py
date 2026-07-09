# Source Generated with Decompyle++
# File: get_community_birthday_state.pyc (Python 3.11)

if not common_config.is_enable_community():
    return CommunityAgeLimitState.BIRTHDAY_STATE_HAS_SET
if None:
    return CommunityAgeLimitState.BIRTHDAY_STATE_HAS_SET
record = None().get_record(TableID.USER_STUFF_EX, GameDataMgr().user_id)
if record:
    has_set_birthday = record[UserStuffExField.SET_UNISDK_BIRTHDAY]
    if has_set_birthday != 1:
        return CommunityAgeLimitState.BIRTHDAY_STATE_NO_SET
    birthday = None[UserStuffExField.UNISDK_BIRTHDAY]
    server_time = int(time_utils.get_server_time())
    year = (server_time - birthday) // 31536000
    if year < COMMUNITY_AGE_LIMIT:
        return CommunityAgeLimitState.BIRTHDAY_STATE_13
    if None < COMMUNITY_AGE_LIMIT_18:
        return CommunityAgeLimitState.BIRTHDAY_STATE_14_17
    return None.BIRTHDAY_STATE_UP_18
return None.BIRTHDAY_STATE_NO_SET
