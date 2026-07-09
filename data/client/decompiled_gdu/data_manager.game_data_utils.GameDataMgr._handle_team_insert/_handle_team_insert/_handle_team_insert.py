# Source Generated with Decompyle++
# File: _handle_team_insert.pyc (Python 3.11)

if team_record[TeamField.USERID] != self.user_id:
    return None
notify_data = None
team_utils = team_utils
import common
if team_record[TeamField.ACTION] == TeamField.Action.ACTION_PARK:
    ship_uid_list = team_utils.get_ship_uid_list_of_team(team_record[TeamField.TEAM_ID])
    for ship_id_u in ship_uid_list:
        ship_record = self.get_record(TableID.SHIP, ship_id_u)
        if ship_record:
            notify_data.append(self._handle_ship_insert(ship_record))
team_record = self.get_record(TableID.TEAM, team_record[TeamField.TEAM_ID])
ship_uid_list = team_utils.get_ship_uid_list_of_team(team_record[TeamField.TEAM_ID])
ship_estimate_table = self.get_table(SHIP_ESTIMATE)
for ship_id_u in ship_uid_list:
    if ship_id_u in ship_estimate_table:
        ship_record = self.get_record(TableID.SHIP, ship_id_u)
        if ship_record:
            notify_data.append(self._handle_ship_delete(ship_id_u, ship_record))
    if notify_data:
        self.data_event_mgr.notify_data_events(notify_data, True)
        return None
    return None
