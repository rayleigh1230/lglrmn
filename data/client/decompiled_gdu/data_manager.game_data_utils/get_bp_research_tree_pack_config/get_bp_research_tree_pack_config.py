# Source Generated with Decompyle++
# File: get_bp_research_tree_pack_config.pyc (Python 3.11)

Tb_cfg_bp_research_tree_pack = Tb_cfg_bp_research_tree_pack
Tb_cfg_bp_research_tree_pack_sp = Tb_cfg_bp_research_tree_pack_sp
import common.config.db
pack_config = list(Tb_cfg_bp_research_tree_pack.get(bp_pack_id))
sp_pack_config = list(get_bp_research_tree_pack_sp_record(sp_bp_pack_id)) if sp_bp_pack_id else None
if sp_pack_config:
    if sp_pack_config[Tb_cfg_bp_research_tree_pack_sp.MODEL]:
        pack_config[Tb_cfg_bp_research_tree_pack.MODEL_PATH] = sp_pack_config[Tb_cfg_bp_research_tree_pack_sp.MODEL]
    if sp_pack_config[Tb_cfg_bp_research_tree_pack_sp.ICON]:
        pack_config[Tb_cfg_bp_research_tree_pack.ICON_PATH] = sp_pack_config[Tb_cfg_bp_research_tree_pack_sp.ICON]
    if sp_pack_config[Tb_cfg_bp_research_tree_pack_sp.NAME]:
        pack_config[Tb_cfg_bp_research_tree_pack.NAME] = sp_pack_config[Tb_cfg_bp_research_tree_pack_sp.NAME]
    if sp_pack_config[Tb_cfg_bp_research_tree_pack_sp.EFFECT_NAME]:
        pack_config[Tb_cfg_bp_research_tree_pack.EFFECT_NAME] = sp_pack_config[Tb_cfg_bp_research_tree_pack_sp.EFFECT_NAME]
return pack_config
