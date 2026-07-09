# Source Generated with Decompyle++
# File: _handle_ship_grouped_update.pyc (Python 3.11)

hp_change_notify_info = []
for _, new_record, old_record in grouped_data:
    ship_uid = new_record[ShipField.SHIP_ID_U]
    self._update_ship_data(ship_uid)
    if ShipField.AIRCRAFTS in new_record and ShipField.MODULES in new_record or ShipField.EFFECTS_ENHANCED in new_record:
        self._update_ship_dps_calc(ship_uid)
        self._update_ship_exploit_capacity(ship_uid)
    if ShipField.HP in new_record:
        hp_change_notify_info.append((ship_uid, new_record[ShipField.HP], old_record[ShipField.HP]))
    if ShipField.HP_MAX in new_record:
        GameEventManager().notify('[ship]health_max_changed', ship_uid, new_record[ShipField.HP_MAX], old_record[ShipField.HP_MAX])
    if ShipField.PAINTING in new_record:
        GameEventManager().notify('[ship]decal_id_changed', ship_uid)
    if ShipField.TEAM_ID in new_record:
        GameEventManager().notify('[ship]team_id_changed', ship_uid, new_record[ShipField.TEAM_ID], old_record[ShipField.TEAM_ID])
continue
if hp_change_notify_info:
    GameEventManager().notify('[ship]health_changed', hp_change_notify_info)
    return None
