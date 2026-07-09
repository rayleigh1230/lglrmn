# Source Generated with Decompyle++
# File: get_alliance_building_shared.pyc (Python 3.11)

PlanPointShareSetting = PlanPointShareSetting
import ui.union_conduct_center_plan_point_view
item_record = item_record if item_record else GameDataMgr().get_record(TableID.WORLD_ITEM, item_id)
if not item_record:
    return PlanPointShareSetting.Shut
if None[WorldItemField.ITEM_TYPE] not in (WorldItemField.Type.TYPE_FAMILY_WAREHOUSE, WorldItemField.Type.TYPE_GUILD_DOCK):
    return PlanPointShareSetting.Shut
relation = None(TableID.WORLD_ITEM, item_record)
if not is_relation_can_show_alliance_building_share(relation):
    return PlanPointShareSetting.Shut
if not None.EXTRA_INFO not in item_record or item_record[WorldItemField.EXTRA_INFO]:
    return 0
data = None.loads(item_record[WorldItemField.EXTRA_INFO])
return data.get(str(WorldItemField.ExtraKey.EXTRA_KEY_ORG_BUILD_SELF_ALLOW_SETTING), [
    0])[0]
