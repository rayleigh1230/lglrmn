# Source Generated with Decompyle++
# File: get_orb_cfg_record_by_wid.pyc (Python 3.11)

cfg_star = Tb_cfg_star.get(wid)
if cfg_star:
    cfg_orb = Tb_cfg_star.get_orb_template(cfg_star[Tb_cfg_star.TEMPLATE_ID])
    return cfg_orb
