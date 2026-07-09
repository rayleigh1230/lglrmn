# Source Generated with Decompyle++
# File: get_hightest_cost_ship_id.pyc (Python 3.11)

hightest_cost_ship_id = None
ship_lst = get_bp_ship_ids(ship_type_list)
max_ship_cost = 0
for idx, ship_id in enumerate(ship_lst):
    ship_config = Tb_cfg_ship.get(ship_id)
    if ship_config:
        cost = ship_config[Tb_cfg_ship.COST]
        if check_ship_level(ship_id) and cost > max_ship_cost:
            max_ship_cost = cost
            hightest_cost_ship_id = ship_id
    return hightest_cost_ship_id
