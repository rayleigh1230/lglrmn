# Source Generated with Decompyle++
# File: get_new_bubble_message_red_dot.pyc (Python 3.11)

UserRedDotField = UserRedDotField
import common.config.table_definition
new_bubble_message = []
new_str = get_user_red_dot_data(UserRedDotField.Type.TYPE_PERMANENT, UserRedDotField.Permanent.PERMANENT_OPEN_MAP_QUICK_NEWS)
if not new_str or isinstance(new_str, str):
    return new_bubble_message
new_list = None.split('-')
for new in new_list:
    new_bubble_message.append(int(new))
    return new_bubble_message
