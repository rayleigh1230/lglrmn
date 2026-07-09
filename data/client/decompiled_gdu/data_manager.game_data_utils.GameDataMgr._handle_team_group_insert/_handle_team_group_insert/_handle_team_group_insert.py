# Source Generated with Decompyle++
# File: _handle_team_group_insert.pyc (Python 3.11)

team_utils = team_utils
import common
game_data_utils = game_data_utils
import data_manager
for _, team_record in grouped_data:
    team_id = team_record[TeamField.TEAM_ID]
    self._handle_team_insert(team_record)
    if team_utils.is_planet_team_by_record(team_record):
        continue
    if game_data_utils.get_char_bit_info(team_record[TeamField.ATTR_STR], TeamField.AttrStr.ATTR_STR_PLANET_LANDING):
        continue
    node = self.all_team_record_list.append(team_record)
    self.all_team_record_node_dict[team_id] = node
    return None
