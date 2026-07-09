# Source Generated with Decompyle++
# File: is_alliance_building_share_icon_show.pyc (Python 3.11)

item_record = item_record if item_record else GameDataMgr().get_record(TableID.WORLD_ITEM, item_id)
if not item_record:
    return False
if not None(None, item_record):
    return False
if not None.EXTRA_INFO not in item_record or item_record[WorldItemField.EXTRA_INFO]:
    return False
data = None.loads(item_record[WorldItemField.EXTRA_INFO])
share_data = data.get(str(WorldItemField.ExtraKey.EXTRA_KEY_ORG_BUILD_SELF_ALLOW_SETTING), None)
if not share_data:
    return False
cfg_item_id = None[WorldItemField.CFG_ITEM_ID]
UnionGalaxyMainView = UnionGalaxyMainView
import ui.union.union_main.union_galaxy_main_view
if cfg_item_id == CfgWorldItemField.Id.ID_ORG_COMMAND_CENTER:
    return UnionGalaxyMainView.can_command_center_reward(share_data[2], share_data[3], share_data[0])
if None == CfgWorldItemField.Id.ID_ORG_WEAHOUSE:
    return UnionGalaxyMainView.can_warehouse_reward(share_data[2], share_data[3], share_data[0])
if None == CfgWorldItemField.Id.ID_ORG_DOCK:
    return UnionGalaxyMainView.can_dock_reward(share_data[2], share_data[0])
