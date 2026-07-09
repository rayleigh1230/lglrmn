# Source Generated with Decompyle++
# File: get_newbie_montage_version.pyc (Python 3.11)

if not user_record:
    user_record = GameDataMgr().get_record(TableID.USER, GameDataMgr().user_id)
result_version = 0
if user_record:
    ab_test_dic = parse_cfg_str_to_dict_of_list(user_record[UserField.AB_TEST_FUNCTION], is_num = True)
    result_version = ab_test_dic.get(UserField.AbTestFunction.AB_TEST_FUNCTION_NEWBIE_MONTAGE_VERSION)
return result_version
