# Source Generated with Decompyle++
# File: get_pirate_city_level.pyc (Python 3.11)

npc_team_cfg = get_cfg_npc_union_guard_team_by_item_record(item_record)
if not npc_team_cfg:
    return None
cfg_item_id = None[WorldItemField.CFG_ITEM_ID]
world_item_cfg = Tb_cfg_world_item.get(cfg_item_id)
npc_type = world_item_cfg[Tb_cfg_world_item.NPC_TYPE]
if npc_type not in configdata.SPECIAL_ITEM_LEVEL_NPC_TYPE:
    return None
return None[Tb_cfg_npc_union_guard_team.SHOW_LEVEL]
