# Source Generated with Decompyle++
# File: _init_old_format_activity_id_list.pyc (Python 3.11)

print('+++++++++++++++>>>>_init_old_format_activity_id_list>>')
self._all_activity_id = []
all_data = Tb_cfg_activity.get_all_data()
if not all_data:
    return None
cur_time = None.get_server_time()
ABSOLUTE_TIME_TYPES = (CfgActivityField.ActivityType.ACTIVITY_TYPE_NONE, CfgActivityField.ActivityType.ACTIVITY_TYPE_NORMAL)
for activity_id, activity_config in six.iteritems(all_data):
    if not self.is_activity_can_show_precondition(activity_id):
        continue
    end_time = max(activity_config[Tb_cfg_activity.ACTIVITY_END], activity_config[Tb_cfg_activity.ACTIVITY_CLOSE], activity_config[Tb_cfg_activity.ACTIVITY_OFF])
    activity_type = activity_config[Tb_cfg_activity.ACTIVITY_TYPE]
    if activity_type in ABSOLUTE_TIME_TYPES and end_time and cur_time > end_time:
        continue
    self._all_activity_id.append(activity_id)
    return None
