# Source Generated with Decompyle++
# File: on_union_plan_del.pyc (Python 3.11)

for plan_id in plan_id_list:
    if plan_id in self.league_plan_view_dict:
        plan_record = self.league_plan_view_dict.pop(plan_id)
        GameEventManager().notify('object_selected', None)
        GameEventManager().notify('notify_union_org_plan_delete', plan_id, plan_record)
    if plan_id in self.league_plan_info_dict:
        self.league_plan_info_dict.pop(plan_id)
    self.notify_org_plan_to_all()
    return None
