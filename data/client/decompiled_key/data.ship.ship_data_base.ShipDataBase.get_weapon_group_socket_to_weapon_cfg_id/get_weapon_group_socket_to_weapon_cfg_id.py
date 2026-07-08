# Source Generated with Decompyle++
# File: get_weapon_group_socket_to_weapon_cfg_id.pyc (Python 3.11)

ship_attr = self.ship_attr
weapon_socket_dict = ship_attr.facade.weapon_socket_dict
ret = { }
weapon_info_list = self.weapon_info_list
for weapon_info in weapon_info_list:
    (slot_index, weapon_id, _, group_num) = weapon_info
    weapon_group_socket_name = weapon_socket_dict.get(slot_index)
    if weapon_group_socket_name:
        ret[weapon_group_socket_name] = weapon_id
    return ret
