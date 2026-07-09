# Source Generated with Decompyle++
# File: get_bp_ship_ids.pyc (Python 3.11)

bp_type_dict = { }
bp_table = GameDataMgr().get_table(TableID.SHIP_BLUEPRINT)
for idx, record in six.iteritems(bp_table):
    if record[ShipBlueprintField.USERID] != GameDataMgr().user_id:
        continue
    if include_season and record[ShipBlueprintField.FACILITY_ID] > 0:
        continue
    ship_id = record[ShipBlueprintField.SHIP_ID]
    ship_bp_config = Tb_cfg_ship.get(ship_id)
    if ship_bp_config and ship_bp_config[Tb_cfg_ship.SHIP_TYPE] in ship_type_list:
        bp_type = ship_id / 100
        if ship_id % 10 != 1 and bp_type in bp_type_dict:
            continue
        bp_type_dict[bp_type] = ship_id
    return list(bp_type_dict.values())
