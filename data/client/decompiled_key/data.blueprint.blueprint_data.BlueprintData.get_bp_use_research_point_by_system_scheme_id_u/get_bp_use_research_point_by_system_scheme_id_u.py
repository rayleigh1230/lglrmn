# Source Generated with Decompyle++
# File: get_bp_use_research_point_by_system_scheme_id_u.pyc (Python 3.11)

if self.bp_use_research_point:
    self.update_bp_use_research_point()
systems = blueprint_utils.get_system_ids_by_record(self.blueprint_record, scheme_id_u = system_scheme_id_u)
(_, unlock_group) = blueprint_utils.get_bp_system_group_info(self.blueprint_record)
cost_enhance = 0
cost_unlock = 0
for system_id in systems:
    cost_enhance += self.system_cost_point_dict.get(system_id, 0)
    cfg_system = Tb_cfg_ship_system.get(system_id)
    group = cfg_system[Tb_cfg_ship_system.GROUP]
    if group in unlock_group:
        cost_unlock += configdata.BLUEPRINT_WEAPON_SYSTEM_EQUIP_TECHNICAL_COST
    return cost_enhance + cost_unlock
