# Source Generated with Decompyle++
# File: user_ship_reform_update.pyc (Python 3.11)

server_time = time_utils.get_server_time()
table = GameDataMgr().get_table(SHIP_REFORM)
remove_ship = []
for ship_id_u, ship_reform_record in six.iteritems(table):
    if ship_reform_record[ShipField.REFORMING_END_TIME] <= server_time:
        remove_ship.append(ship_id_u)
        continue
    GameEventManager().notify('ship_reform_update', ship_id_u, int(ship_reform_record[ShipField.REFORMING_END_TIME] - server_time))
    for ship_id_u in remove_ship:
        GameDataMgr().delete_record(SHIP_REFORM, ship_id_u, notify = True)
        return None
