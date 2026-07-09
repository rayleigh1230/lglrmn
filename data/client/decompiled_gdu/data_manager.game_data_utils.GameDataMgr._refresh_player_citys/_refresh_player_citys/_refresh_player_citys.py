# Source Generated with Decompyle++
# File: _refresh_player_citys.pyc (Python 3.11)

parse_cfg_str_to_list_of_list = parse_cfg_str_to_list_of_list
import data_manager.game_data_utils
record = GameDataMgr().get_record(TableID.SYS_CITY, SysCityField.Id.ID)
if record:
    record_data = parse_cfg_str_to_list_of_list(record[SysCityField.INFO], True)
    for npc_city_id, union_id in record_data:
        self.npc_city_union_id[npc_city_id] = union_id
        return None
        return None
