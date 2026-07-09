# Source Generated with Decompyle++
# File: get_res_build_airspace.pyc (Python 3.11)

airspace_table = GameDataMgr().get_table(TableID.BUILD_AIRSPACE)
for airspace_wid, airspace_record in six.iteritems(airspace_table):
    if airspace_record[BuildAirspaceField.USERID] == GameDataMgr().user_id:
        wid_lb = airspace_record[BuildAirspaceField.LEFT_BOTTOM]
        wid_rt = airspace_record[BuildAirspaceField.RIGHT_TOP]
        index_g3_lb = map_utils.wid_to_index_g3(wid_lb)
        index_g3_rt = map_utils.wid_to_index_g3(wid_rt)
        index_g3 = map_utils.wid_to_index_g3(wid)
        if  <= index_g3_lb[1], index_g3[1] or index_g3_lb[1], index_g3[1] <= index_g3_rt[1]:
            pass
        
        if  <= index_g3_lb[2], index_g3[2] or index_g3_lb[2], index_g3[2] <= index_g3_rt[2]:
            pass
        
        
        return None, airspace_record
    return None
