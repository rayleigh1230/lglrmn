# Source Generated with Decompyle++
# File: get_stargate_building_id.pyc (Python 3.11)

sys_city_record = GameDataMgr().get_record(TableID.SYS_CITY, SysCityField.Id.ID_STARGATE_STAGE)
building_id = None
if sys_city_record:
    info = sys_city_record[SysCityField.INFO]
    info_record = parse_cfg_str_to_list_of_list(info, is_num = True)
    for city_record in info_record:
        building_id = city_record[0]
        if city_record[1] == STARGATE_AND_RUIN_ID[0]:
            
            return None, building_id
        return building_id
