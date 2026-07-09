# Source Generated with Decompyle++
# File: get_affix_skill_ids.pyc (Python 3.11)

Tb_cfg_equipment = Tb_cfg_equipment
import common.config.db
cfg_equipment = Tb_cfg_equipment.get(cfg_equip_id)
affix_skill = parse_cfg_str_to_dict_of_list(cfg_equipment[Tb_cfg_equipment.AFFIX_SKILL], is_num = True)
return list(affix_skill.values())
