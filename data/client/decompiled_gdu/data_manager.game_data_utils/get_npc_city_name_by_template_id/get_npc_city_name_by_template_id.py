# Source Generated with Decompyle++
# File: get_npc_city_name_by_template_id.pyc (Python 3.11)

config = Tb_cfg_npc_world_item.get(template_id)
if config and config[Tb_cfg_npc_world_item.NAME]:
    name = config[Tb_cfg_npc_world_item.NAME] + config[Tb_cfg_npc_world_item.FUNC_NAME]
    return name
