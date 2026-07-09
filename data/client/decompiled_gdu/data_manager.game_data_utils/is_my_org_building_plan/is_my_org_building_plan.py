# Source Generated with Decompyle++
# File: is_my_org_building_plan.pyc (Python 3.11)

if PlanField.TARGET_TYPE in plan_record and plan_record[PlanField.TARGET_TYPE] != PlanField.Type.TYPE_BASE:
    return False
result = None
if PlanField.USERID in plan_record and plan_record[PlanField.USERID] != GameDataMgr().user_id:
    return False
org_building_list = [
    None.Type.TYPE_FAMILY_WAREHOUSE,
    WorldItemField.Type.TYPE_GUILD_DOCK]
if PlanField.TARGET_ID in plan_record and plan_record[PlanField.TARGET_ID] > 0:
    world_item_table = GameDataMgr().get_table(TableID.WORLD_ITEM)
    for building_id, record in six.iteritems(world_item_table):
        if building_id == plan_record[PlanField.TARGET_ID] and record[WorldItemField.ITEM_TYPE] in org_building_list:
            result = True
        
if PlanField.BUILD_ITEM_ID in plan_record and plan_record[PlanField.BUILD_ITEM_ID] > 0:
    item_cfg = Tb_cfg_world_item.get(plan_record[PlanField.BUILD_ITEM_ID])
    if item_cfg and item_cfg[Tb_cfg_world_item.WORLD_ITEM_TYPE] in org_building_list:
        result = True
return result
