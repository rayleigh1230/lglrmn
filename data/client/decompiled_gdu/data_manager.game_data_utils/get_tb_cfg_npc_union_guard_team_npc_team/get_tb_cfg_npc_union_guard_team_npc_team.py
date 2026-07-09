# Source Generated with Decompyle++
# File: get_tb_cfg_npc_union_guard_team_npc_team.pyc (Python 3.11)

if npc_team_cfg[Tb_cfg_npc_union_guard_team.NEW_APPLY_TIME] and get_server_open_time() >= npc_team_cfg[Tb_cfg_npc_union_guard_team.NEW_APPLY_TIME]:
    npc_team = npc_team_cfg[Tb_cfg_npc_union_guard_team.NPC_TEAM_NEW]
else:
    npc_team = npc_team_cfg[Tb_cfg_npc_union_guard_team.NPC_TEAM]
return npc_team
