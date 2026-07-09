# Source Generated with Decompyle++
# File: _handle_user_stuff_update.pyc (Python 3.11)

if update_record[UserResField.USERID] == self.user_id:
    if PLAN_POINT_CUR in update_record:
        return None
    game_data_utils = game_data_utils
    import data_manager
    game_data_utils.cal_user_estimated_stuff()
    if UserStuffField.TALENT_TYPE_INFO in update_record:
        current_type_info = game_data_utils.parse_cfg_str_to_dict_of_list(update_record[UserStuffField.TALENT_TYPE_INFO], is_num = True)
        old_type_info = game_data_utils.parse_cfg_str_to_dict_of_list(_old_record[UserStuffField.TALENT_TYPE_INFO], is_num = True)
        if CfgUnionTalentField.Type.TYPE_GUILD_DOCK_REPAIR not in current_type_info and CfgUnionTalentField.Type.TYPE_GUILD_DOCK_REPAIR in old_type_info:
            self._remove_all_repair_ship_from_guild()
        elif CfgUnionTalentField.Type.TYPE_GUILD_DOCK_REPAIR in current_type_info and CfgUnionTalentField.Type.TYPE_GUILD_DOCK_REPAIR not in old_type_info:
            self._add_shipyard_ship_to_repair_after_talen_opened()
    if UserStuffField.UNLOCK_USER_COMMAND in update_record:
        user_commands = game_data_utils.parse_cfg_str_to_list(update_record[UserStuffField.UNLOCK_USER_COMMAND], is_num = True)
        if UserStuffField.UserCommand.USER_COMMAND_UNLOCK_SHIP_REPAIR in user_commands:
            self.refresh_ship_repair_when_unlock()
            return None
        return None
    return None
