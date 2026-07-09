# Source Generated with Decompyle++
# File: on_union_plan_add.pyc (Python 3.11)

for data in datas:
    plan_data = data[0]
    org_plan_data = data[1]
    self.league_plan_view_dict[plan_data[PlanField.ID]] = plan_data
    self.league_plan_info_dict[org_plan_data[LeaguePlanField.PLAN_ID]] = org_plan_data
    GameEventManager().notify('notify_union_org_plan_add', plan_data)
    self.notify_org_plan_to_all()
    return None
