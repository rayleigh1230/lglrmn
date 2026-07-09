# Source Generated with Decompyle++
# File: get_player_base_size_upgrading_info.pyc (Python 3.11)

player_base_id = get_player_base_building_id()
region_size_ids = (CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE)
max_level = -1
is_upgrading = False
facility_table = GameDataMgr().get_table(TableID.FACILITY)
for facility_id_u, facility_record in six.iteritems(facility_table):
    if facility_record[FacilityField.BELONG_ID] != player_base_id:
        continue
    if facility_record[FacilityField.FACILITY_ID] not in region_size_ids:
        continue
    cur_upgrading = facility_record[FacilityField.STATE] in (FacilityField.State.STATE_UPGRADING, FacilityField.State.STATE_BUILDING)
    cur_level = facility_record[FacilityField.LEVEL] + 1 if cur_upgrading else 0
    if cur_level > max_level:
        max_level = cur_level
        is_upgrading = cur_upgrading
    if max_level < 0:
        return (0, False)
    return (None, is_upgrading)
