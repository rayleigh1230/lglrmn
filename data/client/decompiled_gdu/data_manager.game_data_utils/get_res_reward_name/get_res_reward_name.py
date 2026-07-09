# Source Generated with Decompyle++
# File: get_res_reward_name.pyc (Python 3.11)

if res_id == CfgResDefField.ResId.RES_ID_WEAPON_TECH:
    cfg = Tb_cfg_weapon_tech.get(pack_id)
    if cfg:
        return cfg[Tb_cfg_weapon_tech.NAME]
if res_id == CfgResDefField.ResId.RES_ID_BP_TECHNICAL:
    cfg = Tb_cfg_blueprint_technical.get(pack_id)
    if cfg:
        return cfg[Tb_cfg_blueprint_technical.NAME]
if res_id == CfgResDefField.ResId.RES_ID_BP_ADDITIONAL_SYS:
    cfg = Tb_cfg_blueprint_additional_sys.get(pack_id)
    if cfg:
        return cfg[Tb_cfg_blueprint_additional_sys.NAME]
if res_id == CfgResDefField.ResId.RES_ID_EXP_COLLECTOR:
    cfg = Tb_cfg_exp_collector.get(pack_id)
    if cfg:
        return cfg[Tb_cfg_exp_collector.NAME]
res_record = Tb_cfg_res_def.get(res_id)
if res_record:
    return res_record[Tb_cfg_res_def.NAME]
