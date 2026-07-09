# Source Generated with Decompyle++
# File: refresh_l4_ruin_city.pyc (Python 3.11)

record = self.get_record(TableID.SYS_CITY, SysCityField.Id.ID_L4_RUIN_CITY)
if record:
    parse_cfg_str_to_dict_of_list = parse_cfg_str_to_dict_of_list
    import data_manager.game_data_utils
    self.l4_ruin_city_lst = parse_cfg_str_to_dict_of_list(record[SysCityField.INFO], is_num = True, is_force_list = True, default = { })
    return None
self.l4_ruin_city_lst = None
