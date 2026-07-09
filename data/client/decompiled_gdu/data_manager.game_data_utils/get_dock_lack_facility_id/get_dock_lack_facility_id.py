# Source Generated with Decompyle++
# File: get_dock_lack_facility_id.pyc (Python 3.11)

EFFECT_DOCK = 1019
f_set = set()
for _, record in six.iteritems(Tb_cfg_facility_level_ex.get_all_data()):
    _f_id = record[Tb_cfg_facility_level_ex.FACILITY_ID]
    if not is_legal_facility_id(_f_id, True):
        continue
    f_level = record[Tb_cfg_facility_level_ex.LEVEL]
    f_id = _f_id * 100 + f_level
    if record[Tb_cfg_facility_level_ex.IMMEDIATE_EFFECTS]:
        effects = parse_cfg_str_to_list_of_list(record[Tb_cfg_facility_level_ex.IMMEDIATE_EFFECTS], True)
        for effect in effects:
            if effect[0] == EFFECT_DOCK and effect[1] >= level:
                f_set.add((f_id, effect[1]))
            final_f_id = (lambda .0: pass# WARNING: Decompyle incomplete
)(f_set()) + 1
            final_level = (lambda .0: pass# WARNING: Decompyle incomplete
)(f_set()) + 1
            for cur_id, cur_level in f_set:
                if is_sub_facility(cur_id / 100):
                    cur_id = sub_facility_id_to_main_facility_id(cur_id / 100) * 100 + cur_level
                if (cur_level < final_level or cur_level == final_level) and cur_id < final_f_id:
                    final_level = cur_level
                    final_f_id = cur_id
                return final_f_id
