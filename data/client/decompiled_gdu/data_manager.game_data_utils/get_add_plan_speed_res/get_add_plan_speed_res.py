# Source Generated with Decompyle++
# File: get_add_plan_speed_res.pyc (Python 3.11)

res_add_plan_speed_dict = collections.defaultdict((lambda : 0))
game_data_mgr = GameDataMgr()
plan_table = game_data_mgr.get_table(TableID.PLAN)
if plan_table:
    for plan_id, plan_record in six.iteritems(plan_table):
        if plan_record[PlanField.USERID] != game_data_mgr.user_id:
            continue
        res_plan_add_speed = parse_cfg_str_to_dict_of_list(plan_record[PlanField.RES_EXPLOIT_SPEED])
        for res_type, res_speed in six.iteritems(res_plan_add_speed):
            res_type = int(res_type)
            res_speed = int(res_speed)
            return res_add_plan_speed_dict
