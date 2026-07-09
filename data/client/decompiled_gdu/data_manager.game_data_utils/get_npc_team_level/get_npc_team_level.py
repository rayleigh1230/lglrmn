# Source Generated with Decompyle++
# File: get_npc_team_level.pyc (Python 3.11)

level_count = { }
cfg_npc_team_ids = collections.defaultdict(set)
if not guard_cfg_npc_team_id_nums:
    guard_cfg_npc_team_id_nums = []
for cfg_npc_team_id, num in guard_cfg_npc_team_id_nums:
    cfg_team = Tb_cfg_npc_team.get(cfg_npc_team_id)
    cur_level = cfg_team[Tb_cfg_npc_team.LEVEL]
    cfg_npc_team_ids[cur_level].add(cfg_npc_team_id)
    if cur_level in level_count:
        continue
    num = None
    sorted_keys = sorted(six.iterkeys(level_count), reverse = True)
    return (sorted_keys(), cfg_npc_team_ids)
