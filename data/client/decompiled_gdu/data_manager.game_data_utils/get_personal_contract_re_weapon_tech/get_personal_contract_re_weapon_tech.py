# Source Generated with Decompyle++
# File: get_personal_contract_re_weapon_tech.pyc (Python 3.11)

all_re_tech_datas = Tb_cfg_re_tech.get_all_data()
for re_tech_id, re_tech_data in six.iteritems(all_re_tech_datas):
    identify_contract_ids = parse_cfg_str_to_list(re_tech_data[Tb_cfg_re_tech.AVAILABLE_PERSONAL_AGREEMENTS], is_num = True)
    if identify_contract_ids and identify_contract_ids[0] == contract_id:
        
        return None, (re_tech_id, re_tech_data)
    return (None, None)
