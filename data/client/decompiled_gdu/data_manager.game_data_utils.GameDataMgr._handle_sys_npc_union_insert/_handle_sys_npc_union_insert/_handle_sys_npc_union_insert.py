# Source Generated with Decompyle++
# File: _handle_sys_npc_union_insert.pyc (Python 3.11)

game_data_utils = game_data_utils
import data_manager
npc_city_set = game_data_utils.parse_cfg_str_to_list(insert_record[SysNpcUnionCityField.CITY_IDS], True)
for _npc_city_id in npc_city_set:
    self.npc_city_union_id[_npc_city_id] = insert_record[SysNpcUnionCityField.UNION_ID]
    return None
