# Source Generated with Decompyle++
# File: _handle_sys_npc_union_delete.pyc (Python 3.11)

game_data_utils = game_data_utils
import data_manager
old_npc_city_set = set(game_data_utils.parse_cfg_str_to_list(_deleted_recotd[SysNpcUnionCityField.CITY_IDS], True))
for _npc_city_id in old_npc_city_set:
    if _npc_city_id in self.npc_city_union_id:
        del self.npc_city_union_id[_npc_city_id]
    return None
