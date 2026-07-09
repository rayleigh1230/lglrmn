# Source Generated with Decompyle++
# File: _handle_io_team_apply_insert.pyc (Python 3.11)

IOApplyRecordType = IOApplyRecordType
import ui.io_explore_help
if new_record[IoApplyField.APPLY_TYPE] != IOApplyRecordType.TYPE_RECEIVE:
    return None
if not None.READ in new_record or new_record[IoApplyField.READ]:
    red_point_name = RedPointName.IO_TEAM_APPLICATIONS
    num = RedPointSystem().get_point_num(red_point_name) + 1
    RedPointSystem().notify_point_num(red_point_name, num)
    return None
return None
