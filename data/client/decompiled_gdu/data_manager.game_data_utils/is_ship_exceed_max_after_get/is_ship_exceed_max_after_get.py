# Source Generated with Decompyle++
# File: is_ship_exceed_max_after_get.pyc (Python 3.11)

building_id = get_player_base_building_id()
(battle_total_cost, battle_max_cost, _) = get_ship_cost_of_building(building_id, False)
total_cost = 0
for res_type, data in six.iteritems(res_dic):
    if res_type == CfgResDefField.ResId.RES_ID_SHIP:
        ship_id = data if isinstance(data, int) else data[0]
        ship_cfg_record = Tb_cfg_ship.get(ship_id)
        if ship_cfg_record:
            total_cost += ship_cfg_record[Tb_cfg_ship.COST]
        continue
    if res_type == CfgResDefField.ResId.RES_ID_NPC_TEAM_EFFECT:
        num = data[0]
        npc_team_effect_id = data[1]
        ship_id = get_ship_id_by_npc_team_effect_id(npc_team_effect_id)
        ship_cfg_record = Tb_cfg_ship.get(ship_id)
        if ship_cfg_record:
            total_cost += ship_cfg_record[Tb_cfg_ship.COST] * num
    if total_cost == 0:
        return False
    return None + total_cost > battle_max_cost
