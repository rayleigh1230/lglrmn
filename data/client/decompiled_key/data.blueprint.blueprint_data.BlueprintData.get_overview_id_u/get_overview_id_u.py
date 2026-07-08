# Source Generated with Decompyle++
# File: get_overview_id_u.pyc (Python 3.11)

for overview_id_u, record in six.iteritems(GameDataMgr().get_table(TableID.SHIP_BP_OVERVIEW)):
    if record[ShipBpOverviewField.USERID] != GameDataMgr().user_id:
        continue
    if record[ShipBpOverviewField.CFG_OVERVIEW_ID] == self.cfg_bp_id / 100:
        
        return None, overview_id_u
    return None
