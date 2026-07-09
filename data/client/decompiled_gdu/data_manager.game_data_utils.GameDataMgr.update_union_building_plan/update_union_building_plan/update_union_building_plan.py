# Source Generated with Decompyle++
# File: update_union_building_plan.pyc (Python 3.11)

if table_name not in self.union_building_table:
    return None
if not None:
    return None
if None == protocol.DEL_DATA_NOTIFY:
    record_id = record
    if table_name == self.union_building_table[0]:
        if record_id in self.union_building_plan_dict or record_id in self.league_plan_view_dict:
            self.union_building_plan_dict.pop(record_id)
            self.league_plan_view_dict.pop(record_id)
            GameEventManager().notify('refresh_union_building_plan_list_cell')
            return None
        return None
    return None
if None == self.union_building_table[1]:
    for item_record in self.union_building_item_list:
        if item_record[WorldItemField.ID] == record_id:
            self.union_building_item_list.remove(item_record)
        
        return None
        return None
        if record_id in self.union_building_alert_dict:
            self.union_building_alert_dict.pop(record_id)
            return None
        return None
        if change_type == protocol.INSERT_DATA_NOTIFY:
            record_id = record[PlanField.ID]
            if table_name == self.union_building_table[0]:
                game_data_utils = game_data_utils
                import data_manager
                if game_data_utils.is_org_building_plan(record):
                    self.union_building_plan_dict[record_id] = record
                    self.league_plan_view_dict[record_id] = record
                    GameEventManager().notify('refresh_union_building_plan_list_cell')
                    return None
                return None
            if None == self.union_building_table[1]:
                if WorldItemField.USERID in record or record[WorldItemField.USERID] != GameDataMgr().user_id:
                    self.union_building_item_list.append(record)
                    GameEventManager().notify('refresh_union_building_plan_list_cell')
                    return None
                return None
            return None
        if None not in self.union_building_alert_dict:
            self.union_building_alert_dict[record_id] = record
            return None
        return None
        record_id = record[PlanField.ID]
        if table_name == self.union_building_table[0]:
            if record_id in self.union_building_plan_dict:
                for record_key, record_value in six.iteritems(record):
                    self.union_building_plan_dict[record_id][record_key] = record_value
                    self.league_plan_view_dict[record_id][record_key] = record_value
                    GameEventManager().notify('refresh_union_building_plan_list_cell')
                    return None
                    return None
                    if table_name == self.union_building_table[1]:
                        for item_record in self.union_building_item_list:
                            if item_record[WorldItemField.ID] == record_id:
                                for record_key, record_value in six.iteritems(record):
                                    item_record[record_key] = record_value
                                    return None
                                    return None
                                    if record_id in self.union_building_alert_dict:
                                        for record_key, record_value in six.iteritems(record):
                                            self.union_building_alert_dict[record_id][record_key] = record_value
                                            return None
                                            return None
