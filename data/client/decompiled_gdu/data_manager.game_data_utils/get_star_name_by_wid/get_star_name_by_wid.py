# Source Generated with Decompyle++
# File: get_star_name_by_wid.pyc (Python 3.11)

Tb_cfg_star = Tb_cfg_star
import common.config.db
star_config = Tb_cfg_star.get_raw(wid)
if star_config[Tb_cfg_star.WID_TYPE] in (WorldItemField.Type.TYPE_STAR,):
    return star_config[Tb_cfg_star.NAME]
