# Source Generated with Decompyle++
# File: get_activity_id_by_play_id.pyc (Python 3.11)

CfgActivityVersionField = CfgActivityVersionField
import common.config.table_definition
mask = CfgActivityVersionField.VersionIdMax.PLAY_ID_MASK
if play_type:
    candidates = self._play_type_activity_ids.get(play_type, [])
else:
    candidates = self._all_activity_id
matched_ids = []
for activity_id in candidates:
    if activity_id <= mask:
        if activity_id == play_id:
            matched_ids.append(activity_id)
        continue
    if activity_id % mask == play_id:
        matched_ids.append(activity_id)
    if not matched_ids:
        return None
    if None(matched_ids) == 1:
        return matched_ids[0]
    for activity_id in None:
        activity_data = self.get_activity_data(activity_id)
        if activity_data and activity_data.is_activity_in_open_time:
            
            return None, activity_id
        return max(matched_ids)
