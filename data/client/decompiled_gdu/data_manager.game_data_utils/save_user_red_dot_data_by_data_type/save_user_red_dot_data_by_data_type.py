# Source Generated with Decompyle++
# File: save_user_red_dot_data_by_data_type.pyc (Python 3.11)

if data_type == RED_DOT_FOR_BOOL:
    store_value = '1' if store_value else '0'
else:
    store_value = str(store_value)
save_user_red_dot_data(red_dot_type, red_dot_key, store_value, callback, reg_name)
