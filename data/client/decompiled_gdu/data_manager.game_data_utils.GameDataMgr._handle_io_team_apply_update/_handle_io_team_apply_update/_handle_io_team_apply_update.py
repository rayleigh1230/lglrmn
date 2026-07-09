# Source Generated with Decompyle++
# File: _handle_io_team_apply_update.pyc (Python 3.11)

IOApplyRecordType = IOApplyRecordType
import ui.io_explore_help
if IoApplyField.APPLY_TYPE in old_record and old_record[IoApplyField.APPLY_TYPE] != IOApplyRecordType.TYPE_RECEIVE:
    return None
if not None.READ in updated_record or updated_record[IoApplyField.READ] or IoApplyField.READ in old_record or old_record[IoApplyField.READ]:
    red_point_name = RedPointName.IO_TEAM_APPLICATIONS
    num = max(0, RedPointSystem().get_point_num(red_point_name) - 1)
    RedPointSystem().notify_point_num(red_point_name, num)
    return None
return None
return None
return None
