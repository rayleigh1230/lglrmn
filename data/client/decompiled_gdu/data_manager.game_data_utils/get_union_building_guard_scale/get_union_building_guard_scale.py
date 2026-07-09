# Source Generated with Decompyle++
# File: get_union_building_guard_scale.pyc (Python 3.11)

level_count = { }
cfg_npc_team_ids = collections.defaultdict(set)
cfg_item_id = item_record[WorldItemField.CFG_ITEM_ID]
world_item_cfg = Tb_cfg_world_item.get(cfg_item_id)
npc_level = world_item_cfg[Tb_cfg_world_item.LEVEL]
npc_type = world_item_cfg[Tb_cfg_world_item.NPC_TYPE]
guard_id = npc_level * 100 + npc_type
npc_team_cfg = Tb_cfg_npc_union_guard_team.get(guard_id)
if npc_team_cfg[Tb_cfg_npc_union_guard_team.NEW_APPLY_TIME] and get_server_open_time() >= npc_team_cfg[Tb_cfg_npc_union_guard_team.NEW_APPLY_TIME]:
    npc_team = npc_team_cfg[Tb_cfg_npc_union_guard_team.NPC_TEAM_NEW]
else:
    npc_team = npc_team_cfg[Tb_cfg_npc_union_guard_team.NPC_TEAM]
guard_team = parse_cfg_str_to_list_of_list(npc_team, True)
for team_type, cfg_team_id, num in guard_team:
    if team_type not in (1, 2):
        continue
    cfg_team = Tb_cfg_npc_team.get(cfg_team_id)
    cur_level = cfg_team[Tb_cfg_npc_team.LEVEL]
    cfg_npc_team_ids[cur_level].add(cfg_team_id)
    if cur_level in level_count:
        continue
    num = None
    sorted_keys = sorted(six.iterkeys(level_count), reverse = True)
    return (sorted_keys(), cfg_npc_team_ids)
