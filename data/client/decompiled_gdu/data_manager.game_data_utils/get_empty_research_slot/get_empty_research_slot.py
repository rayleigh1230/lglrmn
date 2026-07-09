# Source Generated with Decompyle++
# File: get_empty_research_slot.pyc (Python 3.11)

user_stuff_record = GameDataMgr().get_record(TableID.USER_STUFF, GameDataMgr().user_id)
if user_stuff_record:
    research_slot_info = user_stuff_record[UserStuffField.RESEARCH_SLOT]
    research_slot_info = parse_cfg_str_to_dict_of_list(research_slot_info, True)
    for slot_idx, pack_id_u in six.iteritems(research_slot_info):
        if pack_id_u == 0:
            
            return None, slot_idx
        return None
