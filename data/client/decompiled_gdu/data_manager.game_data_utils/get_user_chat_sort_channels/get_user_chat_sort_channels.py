# Source Generated with Decompyle++
# File: get_user_chat_sort_channels.pyc (Python 3.11)

OrganizationDataMgr = OrganizationDataMgr
import data_manager.organization.organization_data_mgr
org_group_set = OrganizationDataMgr().get_group_id_set()
user_stuff_ex_record = GameDataMgr().get_record(TableID.USER_STUFF_EX, GameDataMgr().user_id)
if user_stuff_ex_record:
    chat_sort = user_stuff_ex_record.get(UserStuffExField.CHAT_CHANNEL_SORT)
    if chat_sort:
        _list = parse_cfg_str_to_list_of_list(chat_sort, is_num = True)
        new_list = []
        for data in _list:
            (channel_id, group_id) = data
            if channel_id == ChatField.Channel.CHANNEL_ORGANIZATION_GROUP and group_id not in org_group_set:
                continue
            new_list.append(data)
            return new_list
            return []
