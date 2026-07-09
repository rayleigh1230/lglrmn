# Source Generated with Decompyle++
# File: get_npc_ship_ids_by_npc_team_id.pyc (Python 3.11)

if npc_id not in Tb_cfg_npc_team.get_all_data():
    return None
record = None.get(npc_id)
if not record:
    return None
info = None[Tb_cfg_npc_team.SHIP_INFO]
ship_info_list = parse_cfg_str_to_list_of_list(info, True)
ship_id_set = set()
for values in ship_info_list:
    for effect_id in values:
        ship_id = get_ship_id_by_npc_team_effect_id(effect_id)
        ship_id_set.add(ship_id)
        return ship_id_set
