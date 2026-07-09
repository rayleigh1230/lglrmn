# Source Generated with Decompyle++
# File: get_world_channel_occupy_city_msg.pyc (Python 3.11)

UNION_COLOR = '#cef9d18'
ORI_OCCUPY_COLOR = '#cbbbabb'
CITY_COLOR = '#cbbbabb'
NORMAL_COLOR = '#cbbbabb'
index_g3 = map_utils.wid_to_index_g3(wid_pos)
if is_player_union(union_id):
    return language.CHAT_CITY_OCCUPY_TXT.format('{}[{}]{}'.format(UNION_COLOR, union_name, NORMAL_COLOR), '{}[{}]{}'.format(ORI_OCCUPY_COLOR, ori_occupy, NORMAL_COLOR), '{}'.format(level), '{}[{}]{}'.format(CITY_COLOR, city_name, NORMAL_COLOR), '({},{})'.format(index_g3[1], index_g3[2]))
return None.CHAT_NPC_CITY_OCCUPY_TXT.format('{}[{}]{}'.format(NORMAL_COLOR, union_name, NORMAL_COLOR), '{}[{}]{}'.format(UNION_COLOR, ori_occupy, NORMAL_COLOR), '{}'.format(level), '{}[{}]{}'.format(CITY_COLOR, city_name, NORMAL_COLOR), '({},{})'.format(index_g3[1], index_g3[2]))
