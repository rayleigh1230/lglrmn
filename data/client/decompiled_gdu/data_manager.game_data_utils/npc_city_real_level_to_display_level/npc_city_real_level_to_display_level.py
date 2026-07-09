# Source Generated with Decompyle++
# File: npc_city_real_level_to_display_level.pyc (Python 3.11)

Tb_cfg_npc_city_level = Tb_cfg_npc_city_level
import common.config.db
cfg = Tb_cfg_npc_city_level.get(real_level)
if cfg:
    return 1
return None[Tb_cfg_npc_city_level.CLIENT_DISPLAY_LEVEL]
