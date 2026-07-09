# Source Generated with Decompyle++
# File: on_union_plan_update.pyc (Python 3.11)

notify_update_list = (LeaguePlanField.DELEGATE_TEAMS,)
is_update_org_plan_tv = False
if not datas:
    return None
plan_data = None[0]
org_plan_data = datas[1]
if plan_data:
    plan_data_id = plan_data[PlanField.ID]
    if plan_data_id in self.league_plan_view_dict:
        for key, value in six.iteritems(plan_data):
            self.league_plan_view_dict[key] = value
            if org_plan_data:
                org_plan_data_id = org_plan_data[LeaguePlanField.PLAN_ID]
                if org_plan_data_id in self.league_plan_info_dict:
                    for key, value in six.iteritems(org_plan_data):
                        self.league_plan_info_dict[org_plan_data_id][key] = value
                        if not key in notify_update_list and is_update_org_plan_tv:
                            is_update_org_plan_tv = True
                        if is_update_org_plan_tv:
                            self.notify_org_plan_to_all()
                            return None
                        return None
