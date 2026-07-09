# Source Generated with Decompyle++
# File: get_ship_id_by_bp_overview_id.pyc (Python 3.11)

ship_id = None
ship_bp_table = GameDataMgr().get_table(TableID.SHIP_BLUEPRINT)
for bp_id_u, record in six.iteritems(ship_bp_table):
    if record[ShipBlueprintField.BP_OVERVIEW_ID] == bp_overview_id:
        ship_id = record[ShipBlueprintField.CFG_BP_ID]
    
    return ship_id
