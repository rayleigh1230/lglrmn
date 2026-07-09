# Source Generated with Decompyle++
# File: _handle_sys_npc_union_update.pyc (Python 3.11)

if SysNpcUnionCityField.CITY_IDS in _new_record:
    game_data_utils = game_data_utils
    import data_manager
    new_npc_city_set = set(game_data_utils.parse_cfg_str_to_list(_new_record[SysNpcUnionCityField.CITY_IDS], True))
    old_npc_city_set = set(game_data_utils.parse_cfg_str_to_list(_old_record[SysNpcUnionCityField.CITY_IDS], True))
    for _npc_city_id in new_npc_city_set - old_npc_city_set:
        self.npc_city_union_id[_npc_city_id] = _new_record[SysNpcUnionCityField.UNION_ID]
        for _npc_city_id in old_npc_city_set - new_npc_city_set:
            if _npc_city_id in self.npc_city_union_id:
                del self.npc_city_union_id[_npc_city_id]
            return None
            return None
