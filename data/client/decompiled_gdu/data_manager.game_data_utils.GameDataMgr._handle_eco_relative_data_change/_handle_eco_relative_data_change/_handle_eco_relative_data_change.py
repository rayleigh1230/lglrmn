# Source Generated with Decompyle++
# File: _handle_eco_relative_data_change.pyc (Python 3.11)

is_show_activity_earthday_eco_park_tips = is_show_activity_earthday_eco_park_tips
get_eco_park_redpoint_name = get_eco_park_redpoint_name
import ui.activity_earthday.eco_park.eco_park_utils
red_point_name = get_eco_park_redpoint_name()
num = 1 if is_show_activity_earthday_eco_park_tips() else 0
RedPointSystem().notify_point_num(red_point_name, num)
