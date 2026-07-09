# Source Generated with Decompyle++
# File: get_io_team_name.pyc (Python 3.11)

sys_param_utils = sys_param_utils
import data_manager
if sys_param_utils.is_io_season():
    UnionDataMgr = UnionDataMgr
    import data_manager.union.union_data_mgr
    union_data = UnionDataMgr().get_my_union_data()
    if not union_data:
        return None
    team_name = None.union_name
    if team_name:
        return team_name
    return None
record = None().get_record(TableID.IO_TEAMWORK_MEMBER, GameDataMgr().user_id)
if record:
    return record[IoTeamworkMemberField.TEAM_NAME]
