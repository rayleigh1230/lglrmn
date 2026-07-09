# Source Generated with Decompyle++
# File: get_unread_painting_store_ids.pyc (Python 3.11)

configure_record = GameDataMgr().get_record(TableID.USER_CONFIGURATION, GameDataMgr().user_id)
all_store_ids = set(Tb_cfg_painting_store.get_all_data().keys())
all_store_ids = (lambda .0: pass# WARNING: Decompyle incomplete
)(all_store_ids())
if configure_record:
    read_store_ids = set(parse_cfg_str_to_list(configure_record[UserConfigurationField.PAINTING_GOODS_READ_RECORD], is_num = True))
    return all_store_ids - read_store_ids
return set
