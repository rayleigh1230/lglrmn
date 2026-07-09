# Source Generated with Decompyle++
# File: is_all_facility_upgraded.pyc (Python 3.11)

my_building_id = get_player_base_building_id()
self_facilities = get_building_facility(my_building_id)
building_record = GameDataMgr().get_record(TableID.WORLD_ITEM, my_building_id)
cfg_item_id = building_record[WorldItemField.CFG_ITEM_ID]
building_cfg = Tb_cfg_world_item.get(cfg_item_id)
can_build_facilities = parse_cfg_str_to_list(building_cfg[Tb_cfg_world_item.FACILITIES], True)
can_build_facilities = set(can_build_facilities)
current_season_id = sys_param_utils.get_season_id()
for season_id, hide_facility_ids in six.iteritems(configdata.SEASON_FACILITY_LIMIT):
    if season_id == current_season_id:
        can_build_facilities.difference_update(hide_facility_ids)
    contract_personal = GameDataMgr().get_record(TableID.USER_CONTRACT_PERSONAL, GameDataMgr().user_id)
    can_build_facilities = list(can_build_facilities)
    for fid in can_build_facilities:
        if is_sub_facility(fid):
            continue
        if fid in (CfgFacilityField.Fid.FID_CENTER_AREA_SIZE, CfgFacilityField.Fid.FID_GANG_QU_SIZE, CfgFacilityField.Fid.FID_INDUSTRIAL_AREA_SIZE):
            if get_facility_level(fid) >= get_base_facility_max_level():
                continue
            return False
        if not None(fid):
            record = Tb_cfg_facility.get(fid)
            if record[Tb_cfg_facility.CONTRACT_ID] != 0:
                if (contract_personal or contract_personal) and contract_personal[UserContractPersonalField.CONTRACT_ID] != record[Tb_cfg_facility.CONTRACT_ID]:
                    continue
            return False
        return True
