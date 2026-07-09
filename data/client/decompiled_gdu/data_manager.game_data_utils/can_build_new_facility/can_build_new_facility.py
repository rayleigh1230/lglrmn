# Source Generated with Decompyle++
# File: can_build_new_facility.pyc (Python 3.11)

belong_id = record[FacilityField.BELONG_ID]
now_level = record[FacilityField.LEVEL]
now_id = record[FacilityField.FACILITY_ID]
facility_dict = get_building_facility(belong_id)
conditions = []
for data in six.itervalues(Tb_cfg_facility_level_ex.get_all_data()):
    if data[Tb_cfg_facility_level_ex.CONDITION]:
        conditions.append(parse_cfg_str_to_list_of_list(data[Tb_cfg_facility_level_ex.CONDITION]))
    for _suit in conditions:
        reach_level = False
        above_level = True
        for _data in _suit:
            need_level = int(_data[1])
            need_id = int(_data[0])
            if need_id == now_id and need_level == now_level:
                reach_level = True
            _my_id_record = facility_dict.get(need_id)
            if _my_id_record and 'level' in _my_id_record[1] and _my_id_record[1]['level'] >= need_level:
                continue
            above_level = False
            if reach_level and above_level:
                return True
            return False
