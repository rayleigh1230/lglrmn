# Source Generated with Decompyle++
# File: _add_activity_id.pyc (Python 3.11)

print('-------------->>_add_activity_id, activity_id:{}, by_sys:{}'.format(activity_id, by_sys))
if activity_id in self._all_activity_id:
    return None
activity_data = None.get_activity_data(activity_id)
if not activity_data:
    return None
if not None and self.is_activity_can_show_precondition(activity_id):
    return None
None._all_activity_id.append(activity_id)
if not activity_data.is_new_format:
    return None
play_type = None.play_type
print('-------------->>_add_activity_id play_type:', play_type)
if play_type not in self._play_type_activity_ids:
    self._play_type_activity_ids[play_type] = []
if activity_id not in self._play_type_activity_ids[play_type]:
    self._play_type_activity_ids[play_type].append(activity_id)
client_play_type = activity_data.type_param
if client_play_type not in self._client_play_type_activity_ids:
    self._client_play_type_activity_ids[client_play_type] = []
if activity_id not in self._client_play_type_activity_ids[client_play_type]:
    self._client_play_type_activity_ids[client_play_type].append(activity_id)
if play_type == activity_sys_type.TYPE_GALAXY_MARKET or activity_data.is_activity_in_open_time:
    activity_id_config.ID_CURRENT_LOTTERY_MARKET = activity_id
    return None
return None
