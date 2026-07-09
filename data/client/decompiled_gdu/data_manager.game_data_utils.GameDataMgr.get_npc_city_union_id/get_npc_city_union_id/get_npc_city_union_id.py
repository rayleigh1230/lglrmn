# Source Generated with Decompyle++
# File: get_npc_city_union_id.pyc (Python 3.11)

if building_id in self.npc_city_union_id:
    return self.npc_city_union_id.get(building_id)
game_data_utils = game_data_utils
import data_manager
record = self.get_table(TableID.SYS_CITY)
if record or SysCityField.Id.ID in record:
    record_data = game_data_utils.parse_cfg_str_to_list_of_list(record[SysCityField.Id.ID][SysCityField.INFO], True)
    for city_id, union_id in record_data:
        if city_id == building_id:
            
            return None, union_id
        return None
        return None
        return None
