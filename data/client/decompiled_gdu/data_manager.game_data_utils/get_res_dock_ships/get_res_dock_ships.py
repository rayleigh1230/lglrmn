# Source Generated with Decompyle++
# File: get_res_dock_ships.pyc (Python 3.11)

dock_ship_set = None
task_team_ship_set = None
gdm = GameDataMgr()
facility_record = gdm.get_record(TableID.FACILITY, facility_id_u)
if facility_record:
    dock_ship_id_str = facility_record[FacilityField.TASK_TEAM_SHIPS]
    dock_ship_set = (lambda .0: pass# WARNING: Decompyle incomplete
)(dock_ship_id_str.split(',')())
    task_team_ship_set = set()
    task_team_id = facility_record[FacilityField.TASK_TEAM_ID]
    if task_team_id:
        ship_table = gdm.get_table(TableID.SHIP)
        for ship_id_u, ship_record in six.iteritems(ship_table):
            if ship_record.get(ShipField.TEAM_ID) == task_team_id:
                task_team_ship_set.add(ship_id_u)
            return (dock_ship_set, task_team_ship_set)
