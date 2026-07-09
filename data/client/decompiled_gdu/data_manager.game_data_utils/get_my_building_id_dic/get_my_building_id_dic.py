# Source Generated with Decompyle++
# File: get_my_building_id_dic.pyc (Python 3.11)

dic = { }
world_item_table = GameDataMgr().get_table(TableID.WORLD_ITEM)
self_user_id = GameDataMgr().user_id
STANDARD_DEPOT_CFG_ID = STANDARD_DEPOT_CFG_ID
import common.common_definition
for building_id, record in six.iteritems(world_item_table):
    if record[WorldItemField.USERID] == self_user_id and record[WorldItemField.ITEM_TYPE] in item_type_lst:
        if include_building and record[WorldItemField.STATE] in (WorldItemField.State.STATE_BUILDING, WorldItemField.State.STATE_BUILD_CANCELLING):
            continue
        if include_expand_depot and record[WorldItemField.ITEM_TYPE] == WorldItemField.Type.TYPE_DEPOT and record[WorldItemField.CFG_ITEM_ID] != STANDARD_DEPOT_CFG_ID:
            continue
        dic[building_id] = record
    return dic
