# Source Generated with Decompyle++
# File: get_sorted_asset_cfg_ids_by_params.pyc (Python 3.11)

Tb_cfg_equip_bp_skill = Tb_cfg_equip_bp_skill
import common.config.db
Tb_cfg_equipment = Tb_cfg_equipment
import common.config.db
cfg_equipment = Tb_cfg_equipment.get(cfg_equip_id)
main_skill = cfg_equipment[Tb_cfg_equipment.MAIN_SKILL]
asset_effect_dict = {
    0: main_skill }
del_idx_set = []
for idx, skill_id in six.iteritems(affix_skill_dict):
    cfg_equip_skill = Tb_cfg_equip_bp_skill.get(skill_id)
    if cfg_equip_skill[Tb_cfg_equip_bp_skill.SP_SKILL_TYPE] == CfgEffectDefField.SpSkill.SP_SKILL_EXPAND:
        if idx + CfgEffectDefField.Idx.IDX_EXPAND_BASE in affix_skill_dict:
            asset_effect_dict[idx] = affix_skill_dict[idx + CfgEffectDefField.Idx.IDX_EXPAND_BASE]
            del_idx_set.append(idx + CfgEffectDefField.Idx.IDX_EXPAND_BASE)
            continue
        asset_effect_dict[idx] = skill_id
        continue
    asset_effect_dict[idx] = skill_id
    for idx in del_idx_set:
        del asset_effect_dict[idx]
        return asset_effect_dict
