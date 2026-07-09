# Source Generated with Decompyle++
# File: is_alliance_building_shared.pyc (Python 3.11)

PlanPointShareSetting = PlanPointShareSetting
import ui.union_conduct_center_plan_point_view
item_record = item_record if item_record else GameDataMgr().get_record(TableID.WORLD_ITEM, item_id)
if not item_record:
    return False
if None[WorldItemField.ITEM_TYPE] not in (WorldItemField.Type.TYPE_FAMILY_WAREHOUSE, WorldItemField.Type.TYPE_GUILD_DOCK):
    return False
relation = None(TableID.WORLD_ITEM, item_record)
if not is_relation_can_show_alliance_building_share(relation):
    return False
if not None.EXTRA_INFO not in item_record or item_record[WorldItemField.EXTRA_INFO]:
    return True
data = None.loads(item_record[WorldItemField.EXTRA_INFO])
return data.get(str(WorldItemField.ExtraKey.EXTRA_KEY_ORG_BUILD_SELF_ALLOW_SETTING), [
    0])[0] != PlanPointShareSetting.Shut
