# Source Generated with Decompyle++
# File: get_world_item_dock_facilities.pyc (Python 3.11)

cfg_world_item = Tb_cfg_world_item.get(cfg_item_id)
extra_facility = parse_cfg_str_to_dict_of_list(cfg_world_item[Tb_cfg_world_item.DOCK_FACILITIES], True, is_force_list = True)
return extra_facility
