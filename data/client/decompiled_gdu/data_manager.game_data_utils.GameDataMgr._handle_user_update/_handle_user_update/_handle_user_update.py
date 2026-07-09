# Source Generated with Decompyle++
# File: _handle_user_update.pyc (Python 3.11)

user_id = update_record[UserField.USERID]
if user_id == self.user_id:
    if UserField.UNION_ID in update_record:
        new_union_id = update_record[UserField.UNION_ID]
        old_union_id = old_record[UserField.UNION_ID]
        GameEventManager().notify('self_union_changed', new_union_id, old_union_id)
        if new_union_id != 0:
            union_name = update_record.get(UserField.UNION_NAME)
            union_name = language.trans(union_name)
            GameEventManager().notify('toast_text', language.trans(language.HAS_JOIN_UNION_FORMAT).format(union_name))
            union_utils = union_utils
            import data_manager.union
            union_utils.open_union_main_view()
        else:
            self._game_table_dict[TableID.UNION_RELATION].clear()
            self.union_relation_dict.clear()
            self.union_relation_sign_list.clear()
            self.union_relation_custom_color.clear()
            GameEventManager().notify('toast_text', language.trans(language.UNION_MANAGER_VIEW_QUIT))
            Tb_cfg_meta_world_item = Tb_cfg_meta_world_item
            import common.config.db
            remove_item_id = []
            for wid, r in six.iteritems(self.union_view_item_dict):
                if Tb_cfg_meta_world_item.get(key):
                    continue
                remove_item_id.append(key)
                self.union_view_item_dict.clear()
                GameEventManager().notify('union_view_item_update', [], remove_item_id)
                if UserField.PROXIMA_COIN in update_record or UserField.YUAN_BAO in old_record:
                    wealth_management_mainpage = wealth_management_mainpage
                    import ui
                    record = self.get_record(TableID.USER, self.user_id)
                    old_proxima_num = record[UserField.PROXIMA_COIN]
                    new_proxima_num = record[UserField.PROXIMA_COIN]
                    old_yuanbao_num = record[UserField.YUAN_BAO]
                    new_yuanbao_num = record[UserField.YUAN_BAO]
                    if UserField.PROXIMA_COIN in old_record:
                        old_proxima_num = old_record[UserField.PROXIMA_COIN]
                    if UserField.YUAN_BAO in old_record:
                        old_yuanbao_num = old_record[UserField.YUAN_BAO]
                    min_res_cost = wealth_management_mainpage.get_min_res_cost()
                    if new_proxima_num + new_yuanbao_num >= min_res_cost or old_proxima_num + old_yuanbao_num < min_res_cost:
                        common_config.save_newbie_wealth_management_tip(True)
                        newbie_wealth_can_show = newbie_wealth_can_show
                        import activity.activity_first_pay
                        RedPointSystem().notify_point_num(RedPointName.ACTIVITY_NORMAL_WEALTH, 1 if newbie_wealth_can_show() else 0)
                        return None
                    return None
                return None
                return None
                return None
