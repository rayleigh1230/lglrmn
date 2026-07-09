# Source Generated with Decompyle++
# File: _init_new_format_activity_id_list.pyc (Python 3.11)

GameDataMgr = GameDataMgr
import data_manager.game_data_mgr
activity_sys_table = GameDataMgr().get_table(TableID.ACTIVITY_SYS)
if not activity_sys_table:
    return None
for activity_id, sys_record in None.iteritems(activity_sys_table):
    state = sys_record.get(ActivitySysField.STATE)
    if state == ActivitySysField.State.STATE_CLEAR:
        continue
    self._add_sys_activity_id(activity_id)
    return None
