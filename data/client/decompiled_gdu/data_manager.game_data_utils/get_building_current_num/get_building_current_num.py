# Source Generated with Decompyle++
# File: get_building_current_num.pyc (Python 3.11)

DEPOT_CFG_IDS = DEPOT_CFG_IDS
import common.preprocess_data
is_depot = cfg_id in DEPOT_CFG_IDS
ret = 0
my_user_id = GameDataMgr().user_id
world_item_table = GameDataMgr().get_table(TableID.WORLD_ITEM)
for item_id, item in six.iteritems(world_item_table):
    if item[WorldItemField.USERID] == my_user_id:
        cfg_item_id = item[WorldItemField.CFG_ITEM_ID]
        if (cfg_item_id == cfg_id and cfg_id == item[WorldItemField.UPGRADE_CFG_ITEM_ID] or is_depot) and cfg_item_id in DEPOT_CFG_IDS:
            if equip_id_u:
                if item[WorldItemField.EQUIPMENT_IDU] == equip_id_u:
                    ret += 1
                continue
            ret += 1
    plan_table = GameDataMgr().get_table(TableID.PLAN)
    for plan_id, plan in six.iteritems(plan_table):
        if plan[PlanField.USERID] == my_user_id and plan[PlanField.TARGET_ID] == 0:
            if (plan[PlanField.BUILD_ITEM_ID] == cfg_id or is_depot) and plan[PlanField.BUILD_ITEM_ID] in DEPOT_CFG_IDS:
                if equip_id_u:
                    if plan[PlanField.EQUIPMENT_IDU] == equip_id_u:
                        ret += 1
                    continue
                ret += 1
        if equip_id_u:
            equip_record = GameDataMgr().get_record(TableID.USER_EQUIPMENT, equip_id_u)
            unique_id = equip_record[UserEquipmentField.UNIQUE_ID] if equip_record else 0
        else:
            unique_id = 0
run_server_id = get_run_server_id()
user_stat_record = GameDataMgr().get_record(TableID.CROSS_CONQUER_USER_STAT, GameDataMgr().user_id)
build_info = user_stat_record[CrossConquerUserStatField.BUILD_INFO] if user_stat_record else ''
if build_info:
    info_list = JsonUtil.loads(build_info)
    for info in info_list:
        if info[0] == run_server_id:
            continue
        for detail_info in info[1]:
            if (detail_info[2] == cfg_id or is_depot) and detail_info[2] in DEPOT_CFG_IDS:
                if unique_id:
                    if detail_info[4] == unique_id:
                        ret += 1
                    continue
                ret += 1
            return ret
