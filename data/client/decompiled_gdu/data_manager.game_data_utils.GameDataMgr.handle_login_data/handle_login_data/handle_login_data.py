# Source Generated with Decompyle++
# File: handle_login_data.pyc (Python 3.11)

user_data = login_data[0]
union_list = login_data[1]
union_relation_list = login_data[2]
union_mark_list = login_data[3]
union_intelligence_list = login_data[4]
self_intelligence_list = login_data[5]
union_hub_info = login_data[6]
city_union_member_list = login_data[7]
union_relation_sign_list = login_data[8]
union_view_item_list = login_data[9]
league_plan_list = login_data[10]
union_building_plan_list = login_data[11]
league_mark_list = login_data[12]
cross_conquer_data = login_data[13]
CrossConquerDataMgr = CrossConquerDataMgr
import data_manager.cross_conquer.cross_conquer_data_mgr
CrossConquerDataMgr().init_login_data(cross_conquer_data)
for data in user_data:
    data[1] = self._convert_table_data_format(data[1])
    if union_building_plan_list:
        for data in user_data:
            if data[0] == TableID.PLAN and union_building_plan_list[0][1]:
                for x in union_building_plan_list[0][1]:
                    data[1].append(x)
                    if data[0] == TableID.WORLD_ITEM and len(union_building_plan_list) > 1:
                        for world_item_data in union_building_plan_list[1][1]:
                            data[1].append(world_item_data)
                            self.union_building_item_list.append(world_item_data)
                            if data[0] == TableID.USER_ALERT:
                                for user_alert_data in union_building_plan_list[2][1]:
                                    data[1].append(user_alert_data)
                                    self.union_building_alert_dict[user_alert_data[UserAlertField.PRIMARY_KEY]] = user_alert_data
                                    if union_building_plan_list[0][1]:
                                        for plan in union_building_plan_list[0][1]:
                                            self.union_building_plan_dict[plan[PlanField.ID]] = plan
                                            self.reset_some_data_when_relogin()
                                            self.union_user_list = set(union_list)
                                            self.union_mark_list = union_mark_list
                                            GameEventManager().notify('add_alliance_pin_notify', union_mark_list)
                                            self.league_mark_list = league_mark_list
                                            GameEventManager().notify('add_league_pin_notify', league_mark_list)
                                            temp_org_plan_id_list = []
                                            self.league_plan_view_dict.clear()
                                            self.league_plan_info_dict.clear()
                                            for plan in league_plan_list:
                                                plan_data = plan[0]
                                                org_plan_data = plan[1]
                                                temp_org_plan_id_list.append(plan_data[PlanField.ID])
                                                self.league_plan_view_dict[plan_data[PlanField.ID]] = plan_data
                                                self.league_plan_info_dict[org_plan_data[LeaguePlanField.PLAN_ID]] = org_plan_data
                                                for plan_id in self.union_building_plan_dict:
                                                    self.league_plan_view_dict[plan_id] = self.union_building_plan_dict[plan_id]
                                                    GameEventManager().notify('remove_org_plan_model', temp_org_plan_id_list)
                                                    GameEventManager().notify('refresh_org_plan_tv_tab')
                                                    GameEventManager().notify('object_selected', None)
                                                    self.on_union_plan_add(league_plan_list)
                                                    self.union_intelligence_list = set(union_intelligence_list)
                                                    self.organization_hub_info = union_hub_info
                                                    self.self_intelligence_list = set(self_intelligence_list)
                                                    self.city_union_member_list = set(city_union_member_list)
                                                    view_item_len = 3
                                                    view_item_num = len(union_view_item_list) / view_item_len
                                                    for i in range(view_item_num):
                                                        id = union_view_item_list[i * view_item_len + 0]
                                                        wid = union_view_item_list[i * view_item_len + 1]
                                                        view_radius = union_view_item_list[i * view_item_len + 2]
                                                        self.union_view_item_dict[id] = (wid, view_radius)
                                                        notify_data = []
                                                        special_data = []
                                                        for table_name, table_data in user_data:
                                                            CrossConquerTableFilter = CrossConquerTableFilter
                                                            import data_manager.cross_conquer.cross_conquer_define
                                                            self_is_in_cross_galaxy = self_is_in_cross_galaxy
                                                            import data_manager.cross_conquer.cross_conquer_utils
                                                            if self_is_in_cross_galaxy() and table_name in CrossConquerTableFilter.TABLE_FILTER:
                                                                print('[CrossConquer] Table update shield, plz check 4501/4502 protocol', table_name, table_data)
                                                                continue
                                                            if table_name in CrossConquerTableFilter.SPEICAL_FILTER:
                                                                special_data.append((table_name, table_data))
                                                                continue
                                                            key_name = TableKey.get(table_name)
                                                            if key_name:
                                                                tmp_ = self._game_table_dict.get(table_name)
                                                                old_dict_key = { }
                                                                if tmp_:
                                                                    for key_v in tmp_:
                                                                        old_dict_key[key_v] = 1
                                                                        for record in table_data:
                                                                            key = record[key_name]
                                                                            if key in old_dict_key:
                                                                                old_dict_key[key] = 0
                                                                            notify_data.append(self.insert_record(table_name, key, record))
                                                                            for key_v in old_dict_key:
                                                                                if old_dict_key[key_v] == 1:
                                                                                    notify_data.append(self.delete_record(table_name, key_v))
                                                                                except KeyError:
                                                                                    ke = None
                                                                                    print('[{}] login data insert table failed: table name:{}, table_data:{}'.format(ke, table_name, table_data))
                                                                                    ke = None
                                                                                    del ke
                                                                                    continue
                                                                                    ke = None
                                                                                    del ke
                                                                                print('login data error: table "{}" key not found'.format(table_name))
                                                                                for table_name, table_data in special_data:
                                                                                    CrossConquerTableFilter = CrossConquerTableFilter
                                                                                    import data_manager.cross_conquer.cross_conquer_define
                                                                                    self_is_in_cross_galaxy = self_is_in_cross_galaxy
                                                                                    import data_manager.cross_conquer.cross_conquer_utils
                                                                                    if self_is_in_cross_galaxy() and table_name in CrossConquerTableFilter.TABLE_FILTER:
                                                                                        print('[CrossConquer] Table update shield, plz check 4501/4502 protocol', table_name, table_data)
                                                                                        continue
                                                                                    key_name = TableKey.get(table_name)
                                                                                    if key_name:
                                                                                        tmp_ = self._game_table_dict.get(table_name)
                                                                                        old_dict_key = { }
                                                                                        if tmp_:
                                                                                            for key_v in tmp_:
                                                                                                old_dict_key[key_v] = 1
                                                                                                for record in table_data:
                                                                                                    key = record[key_name]
                                                                                                    if key in old_dict_key:
                                                                                                        old_dict_key[key] = 0
                                                                                                    notify_data.append(self.insert_record(table_name, key, record))
                                                                                                    for key_v in old_dict_key:
                                                                                                        if old_dict_key[key_v] == 1:
                                                                                                            notify_data.append(self.delete_record(table_name, key_v))
                                                                                                        except KeyError:
                                                                                                            ke = None
                                                                                                            print('[{}] login data insert table failed: table name:{}, table_data:{}'.format(ke, table_name, table_data))
                                                                                                            ke = None
                                                                                                            del ke
                                                                                                            continue
                                                                                                            ke = None
                                                                                                            del ke
                                                                                                        print('login data error: table "{}" key not found'.format(table_name))
                                                                                                        for union_relation in union_relation_list:
                                                                                                            notify_data.append(self.insert_record(TableID.UNION_RELATION, union_relation[UnionRelationField.ID], union_relation))
                                                                                                            except KeyError:
                                                                                                                ke = None
                                                                                                                print('[{}] login data insert table failed: table name:{}, table_data:{}'.format(ke, TableID.UNION_RELATION, union_relation))
                                                                                                                ke = None
                                                                                                                del ke
                                                                                                                continue
                                                                                                                ke = None
                                                                                                                del ke
                                                                                                            for union_relation in union_relation_sign_list:
                                                                                                                notify_data.append(self.insert_record(TableID.UNION_RELATION_SIGN, union_relation[UnionRelationSignField.ID], union_relation))
                                                                                                                except KeyError:
                                                                                                                    ke = None
                                                                                                                    print('[{}] login data insert table failed: table name:{}, table_data:{}'.format(ke, TableID.UNION_RELATION_SIGN, union_relation))
                                                                                                                    ke = None
                                                                                                                    del ke
                                                                                                                    continue
                                                                                                                    ke = None
                                                                                                                    del ke
                                                                                                                return notify_data
