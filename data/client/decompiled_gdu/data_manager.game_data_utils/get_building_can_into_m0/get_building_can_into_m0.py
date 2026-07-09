# Source Generated with Decompyle++
# File: get_building_can_into_m0.pyc (Python 3.11)

sub_fleet_utils = sub_fleet_utils
import data_manager
item_type = item_record[WorldItemField.ITEM_TYPE]
if item_type == WorldItemField.Type.TYPE_MINING_STATION and item_record[WorldItemField.STATE] == WorldItemField.State.STATE_UPGRADING and sub_fleet_utils.is_building_contain_sub_fleet(item_record[WorldItemField.ID]):
    sub_fleet_team_ids = sub_fleet_utils.get_sub_fleet_team_ids(item_record[WorldItemField.ID])
    SubFleetState = SubFleetState
    import data_manager.sub_fleet_utils
    for team_id in sub_fleet_team_ids:
        if sub_fleet_utils.get_sub_fleet_state(team_id) in (SubFleetState.PARKING, SubFleetState.PARKING_IN_MAP):
            return True
        if item_record[WorldItemField.STATE] in (WorldItemField.State.STATE_BUILDING, WorldItemField.State.STATE_UPGRADING, WorldItemField.State.STATE_BUILD_CANCELLING):
            return False
        if None in (WorldItemField.Type.TYPE_BEACON, WorldItemField.Type.TYPE_ITEM_EFFECT_BEACON, WorldItemField.Type.TYPE_OCCUPIABLE_ITEM, WorldItemField.Type.TYPE_EXERCISE_BEACON, WorldItemField.Type.TYPE_LEVEL_EXERCISE_BEACON, WorldItemField.Type.TYPE_NEWBIE_EXERCISE_ITEM, WorldItemField.Type.TYPE_ITEM_EFFECT_EXERCISE2_BEACON, WorldItemField.Type.TYPE_ITEM_EFFECT_EVA_BEACON):
            return False
        return None
