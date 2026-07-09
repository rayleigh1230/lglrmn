# Source Generated with Decompyle++
# File: get_resource_product_effect.pyc (Python 3.11)

res_dict = {
    152: 0,
    153: 0,
    154: 0 }
facility_table = GameDataMgr().get_table(TableID.FACILITY)
cfg_world_item = Tb_cfg_world_item.get(1)
facility_id_list = parse_cfg_str_to_list(cfg_world_item[Tb_cfg_world_item.FACILITIES], True)
world_item_record = GameDataMgr().get_record(TableID.WORLD_ITEM, building_id)
dock_build_item_id = world_item_record[WorldItemField.DOCK_ITEM_ID]
if dock_build_item_id:
    dock_build_cfg = Tb_cfg_world_item.get(dock_build_item_id)
    if dock_build_cfg:
        dock_facilities_dict = get_world_item_dock_facilities(dock_build_item_id)
        if not dock_facilities_dict:
            dock_build_item_id = None
        else:
            dock_build_item_id = None
for facility_id_u, record in six.iteritems(facility_table):
    if record[FacilityField.USERID] == GameDataMgr().user_id:
        if record[FacilityField.BELONG_ID] == building_id or record[FacilityField.FACILITY_ID] in facility_id_list or record[FacilityField.BELONG_ID] == dock_build_item_id:
            facility_id = record[FacilityField.FACILITY_ID]
            level = record[FacilityField.LEVEL]
            facility_cfg_level = m0_utils.get_facility_level_cfg(facility_id, level)
            if facility_cfg_level:
                effects = parse_cfg_str_to_dict_of_list(facility_cfg_level[Tb_cfg_facility_level_ex.EFFECTS], True)
                for effect_id in list(res_dict.keys()):
                    if effect_id in effects:
                        pass
                    return [
                        res_dict[152],
                        res_dict[153],
                        res_dict[154]]
