# Source Generated with Decompyle++
# File: get_equip_all_affix_types.pyc (Python 3.11)

Tb_cfg_equip_bp_skill = Tb_cfg_equip_bp_skill
import common.config.db
skill_ids = get_affix_skill_ids(cfg_equip_id)
_result = []
for skill_id in skill_ids:
    cfg = Tb_cfg_equip_bp_skill.get(skill_id)
    affix_type = cfg[Tb_cfg_equip_bp_skill.AFFIX_SKILL_TYPE]
    if affix_type not in _result:
        _result.append(affix_type)
    return sorted(_result)
