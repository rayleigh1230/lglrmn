# Source Generated with Decompyle++
# File: get_stargate_wid.pyc (Python 3.11)

Tb_cfg_meta_world_item = Tb_cfg_meta_world_item
import common.config.db
building_id = get_stargate_building_id()
item_config = Tb_cfg_meta_world_item.get(building_id)
if item_config:
    return item_config[Tb_cfg_meta_world_item.POS]
