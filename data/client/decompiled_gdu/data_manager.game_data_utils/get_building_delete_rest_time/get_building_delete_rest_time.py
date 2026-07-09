# Source Generated with Decompyle++
# File: get_building_delete_rest_time.pyc (Python 3.11)

rest_time = 0
if item_record and item_record[WorldItemField.USERID] == GameDataMgr().user_id:
    remove_time = item_record[WorldItemField.REMOVE_TIME]
    if remove_time != 0:
        rest_time = remove_time - time_utils.get_server_time()
return rest_time
