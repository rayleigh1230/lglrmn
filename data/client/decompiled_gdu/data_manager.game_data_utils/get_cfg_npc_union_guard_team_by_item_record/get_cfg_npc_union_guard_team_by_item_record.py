# Source Generated with Decompyle++
# File: get_cfg_npc_union_guard_team_by_item_record.pyc (Python 3.11)

union_id = None
item_type = item_record[WorldItemField.ITEM_TYPE]
if item_type == WorldItemField.Type.TYPE_BUSSINESS_CENTER_BEACON:
    guard_id = item_record[WorldItemField.PLAN_BUSINESS_CFG_GUARD_ID]
elif item_record and WorldItemField.UNION_ID in item_record:
    union_id = item_record[WorldItemField.UNION_ID]
npc_relation_key = 0
if union_id or is_player_union(union_id):
    npc_relation_key = 0
else:
    npc_union_cfg = Tb_cfg_npc_union.get(union_id)
    if npc_union_cfg:
        league_id = npc_union_cfg[Tb_cfg_npc_union.LEAGUE_ID]
        if league_id:
            league_cfg = Tb_cfg_npc_league.get(league_id)
            npc_relation_key = league_cfg[Tb_cfg_npc_league.RELATION_KEY]
if origin_id:
    npc_relation_key = origin_id
cfg_item_id = item_record[WorldItemField.CFG_ITEM_ID]
world_item_cfg = Tb_cfg_world_item.get(cfg_item_id)
npc_level = world_item_cfg[Tb_cfg_world_item.LEVEL]
npc_type = world_item_cfg[Tb_cfg_world_item.NPC_TYPE]
if specified_npc_type:
    npc_type = specified_npc_type
guard_id = npc_relation_key * 10000 + npc_level * 100 + npc_type
npc_team_cfg = Tb_cfg_npc_union_guard_team.get(guard_id)
return npc_team_cfg
