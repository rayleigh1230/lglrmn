# Source Generated with Decompyle++
# File: __init__.pyc (Python 3.11)

self.ship_uid = None
self.ship_id_u = None
self.ship_id = None
self.team_id = None
self.ship_data_mgr = ship_data_mgr
self._ship_dps = None
self._ship_air_dps = None
self._ship_coef_dps = None
self._exploit_capacity = None
self._system_destroy_dict_in_battle = { }
self._occupy_operation_mode = False
self._is_landing_ship = False
self._dynamic_weapon_info_list = []
self._total_fire_special_count = 0
self._current_repair_armor_count = 0
self._shield_hp = 0
self._shield_hp_max = 0
self._setup_ship_data()
self.ship_attr = ShipAttribute.get(self.ship_id)
self._real_row_index = self.ship_attr.layout.row_index
self.region = None
self._table_strategy = None
