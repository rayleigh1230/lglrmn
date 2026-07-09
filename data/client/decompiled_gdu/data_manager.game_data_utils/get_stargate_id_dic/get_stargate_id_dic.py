# Source Generated with Decompyle++
# File: get_stargate_id_dic.pyc (Python 3.11)

_dic = { }
record = GameDataMgr().get_record(TableID.SYS_CITY, SysCityField.Id.ID_STARGATE_STAGE)
if record:
    record_data = parse_cfg_str_to_list_of_list(record[SysCityField.INFO], True)
    for stargate_id, cfg_world_item_id in record_data:
        _dic[stargate_id] = cfg_world_item_id
        return _dic
