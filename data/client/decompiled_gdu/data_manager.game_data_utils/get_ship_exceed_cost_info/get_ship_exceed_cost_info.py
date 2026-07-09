# Source Generated with Decompyle++
# File: get_ship_exceed_cost_info.pyc (Python 3.11)

total_cost = 0
for res_type, data in six.iteritems(res_dic):
    if res_type == CfgResDefField.ResId.RES_ID_SHIP:
        if isinstance(data, int):
            ship_id = data
            num = 1
        elif isinstance(data, (list, tuple)) and len(data) >= 2:
            ship_id = data[0]
            num = data[1]
        
        ship_cfg_record = Tb_cfg_ship.get(ship_id)
        if ship_cfg_record:
            total_cost += ship_cfg_record[Tb_cfg_ship.COST] * num
        continue
    if res_type == CfgResDefField.ResId.RES_ID_NPC_TEAM_EFFECT:
        if isinstance(data, (list, tuple)) and len(data) >= 2:
            num = data[0]
            npc_team_effect_id = data[1]
        
        ship_id = get_ship_id_by_npc_team_effect_id(npc_team_effect_id)
        ship_cfg_record = Tb_cfg_ship.get(ship_id)
        if ship_cfg_record:
            total_cost += ship_cfg_record[Tb_cfg_ship.COST] * num
continue
if total_cost == 0:
    return None
cost_icon_path = None
return (total_cost, cost_icon_path)
