# Source Generated with Decompyle++
# File: get_meta_npc_city_data.pyc (Python 3.11)

map_utils = map_utils
import strategy.map
MetaNpcCityInfo = MetaNpcCityInfo
import common.preprocess_data
item_record = Tb_cfg_meta_world_item.get_at_ver(map_ver, item_id, proto_ver = proto_ver)
if not item_record:
    return None
if None[Tb_cfg_meta_world_item.ITEM_TYPE] not in common_config.NPC_CITY_TYPE:
    return None
view_radius = None[Tb_cfg_meta_world_item.VIEW_RADIUS]
template_id = item_record[Tb_cfg_meta_world_item.TEMPLATE_ID]
npc_city_record = Tb_cfg_npc_world_item.get(template_id)
if npc_city_record:
    cfg_id = npc_city_record[Tb_cfg_npc_world_item.CFG_ITEM_ID]
    _item_record = Tb_cfg_world_item.get(cfg_id)
    if _item_record:
        view_radius = _item_record[Tb_cfg_world_item.VIEW_RADIUS]
pos = item_record[Tb_cfg_meta_world_item.POS]
(g2_pos_x, g2_pos_y) = map_utils.wid_to_index_g2(pos)
return MetaNpcCityInfo(item_record, g2_pos_x, g2_pos_y, view_radius)
