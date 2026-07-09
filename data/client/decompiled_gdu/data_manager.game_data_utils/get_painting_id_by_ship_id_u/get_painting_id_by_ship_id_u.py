# Source Generated with Decompyle++
# File: get_painting_id_by_ship_id_u.pyc (Python 3.11)

ship_record = GameDataMgr().get_record(TableID.SHIP, ship_id_u)
return get_painting_id_by_ship_record(ship_record)
