# Source Generated with Decompyle++
# File: get_season_attr.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_STUFF_EX, GameDataMgr().user_id)
if not record:
    return 0
bin_str = None(record[UserStuffExField.SEASON_ATTR], 32)
bit_len = len(bin_str)
index = bit_len - 1 - season_attr_index
return int(bin_str[index])
