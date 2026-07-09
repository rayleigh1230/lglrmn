# Source Generated with Decompyle++
# File: get_ship_relation.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
if strategy and strategy.ship_table_name == TableID.SHIP_PLAY:
    return RELATION_SELF
if not None:
    return common_definition.RELATION_ENEMY
team_type = None[TeamField.TEAM_TYPE]
if team_type == TeamField.Type.TYPE_NEWBIE_FRIEND_NPC:
    return RELATION_FRIEND
if None == TeamField.Type.TYPE_IO_TRACE_PATROL:
    return common_definition.RELATION_ENEMY_NPC
if None == TeamField.Type.TYPE_BOSS_DUNGEON_PLAYER:
    return RELATION_SELF
if None == TeamField.Type.TYPE_CROSS_EXERCISE_TEAM and team_record[TeamField.USERID] == GameDataMgr().user_id:
    return RELATION_SELF
team_utils = team_utils
import common
if team_utils.is_team_eva_battle_virtual_team(team_record = team_record, is_self = True, strategy = strategy):
    return RELATION_SELF
if None() and is_l5_security_team(team_record[TeamField.TEAM_ID]):
    return common_definition.RELATION_ENEMY
io_galaxy_utils = io_galaxy_utils
import common
if io_galaxy_utils.is_io_security_team(team_record[TeamField.TEAM_ID], strategy = strategy) and io_galaxy_utils.is_io_threat():
    return RELATION_ENEMY
if None.is_perpetual_warzone_self_team(team_record = team_record):
    return RELATION_SELF
if None.is_military_drill_player_team(team_record[TeamField.TEAM_ID]):
    return RELATION_SELF
union_id = None.get(TeamField.UNION_ID)
superior_user_id = team_record.get(TeamField.SUPERIOR_USERID)
league_id = team_record.get(TeamField.LEAGUE_ID)
return get_common_relation(ship_user_id, union_id, superior_user_id, league_id)
