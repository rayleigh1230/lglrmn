# Source Generated with Decompyle++
# File: save_new_bubble_message_red_dot.pyc (Python 3.11)

UserRedDotField = UserRedDotField
import common.config.table_definition
check_list = get_new_bubble_message_red_dot()
check_list.append(new_bubble_message)
check_str = ''
for check in check_list:
    check_str += '{}-'.format(check)
    if check_str:
        check_str = check_str[:-1]
save_user_red_dot_data(UserRedDotField.Type.TYPE_PERMANENT, UserRedDotField.Permanent.PERMANENT_OPEN_MAP_QUICK_NEWS, check_str)
