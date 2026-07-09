# Source Generated with Decompyle++
# File: get_npc_guard_scale.pyc (Python 3.11)

cfg_npc_team_ids = collections.defaultdict(set)
level_count = { }
npc_team_cfg = get_cfg_npc_union_guard_team_by_item_record(item_record, origin_id = origin_id, specified_npc_type = specified_npc_type)
if not npc_team_cfg:
    return ([], cfg_npc_team_ids)
if None[Tb_cfg_npc_union_guard_team.NEW_APPLY_TIME] and get_server_open_time() >= npc_team_cfg[Tb_cfg_npc_union_guard_team.NEW_APPLY_TIME]:
    npc_team = npc_team_cfg[Tb_cfg_npc_union_guard_team.NPC_TEAM_NEW]
else:
    npc_team = npc_team_cfg[Tb_cfg_npc_union_guard_team.NPC_TEAM]
guard_team = parse_cfg_str_to_list_of_list(npc_team, True)
for guard_team_data in guard_team:
    if len(guard_team_data) == 3:
        (team_type, cfg_team_id, num) = guard_team_data
    elif len(guard_team_data) == 4:
        (team_type, cfg_team_id, num, _) = guard_team_data
    
    if team_type not in (1, 2):
        continue
    cfg_team = Tb_cfg_npc_team.get(cfg_team_id)
    if not cfg_team:
        utils = utils
        import common
        utils.check_condition_error(False, 'Tb_cfg_npc_team', 'Tb_cfg_npc_team lack {}'.format(cfg_team_id))
        continue
    cur_level = cfg_team[Tb_cfg_npc_team.LEVEL]
    cfg_npc_team_ids[cur_level].add(cfg_team_id)
    if cur_level in level_count:
        continue
    num = None
    sorted_keys = sorted(six.iterkeys(level_count), reverse = True)
    return (sorted_keys(), cfg_npc_team_ids)
