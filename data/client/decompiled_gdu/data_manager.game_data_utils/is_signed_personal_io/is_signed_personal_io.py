# Source Generated with Decompyle++
# File: is_signed_personal_io.pyc (Python 3.11)

if sys_param_utils.is_io_season():
    return is_personal_io_camp()
record = None().get_record(TableID.IO_TEAMWORK_MEMBER, GameDataMgr().user_id)
if record and IoTeamworkMemberField.SINGLE_USER in record:
    return bool(record[IoTeamworkMemberField.SINGLE_USER])
