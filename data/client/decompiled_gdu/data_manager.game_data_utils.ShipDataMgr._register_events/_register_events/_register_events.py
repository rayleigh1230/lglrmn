# Source Generated with Decompyle++
# File: _register_events.pyc (Python 3.11)

data_event_mgr = DataEventMgr()
data_event_mgr.register_data_event(self.get_ship_table_name(), protocol.GROUPED_INSERT_DATA_NOTIFY, self._handle_ship_grouped_insert, self.reg_name)
data_event_mgr.register_data_event(self.get_ship_table_name(), protocol.GROUPED_UPDATE_DATA_NOTIFY, self._handle_ship_grouped_update, self.reg_name)
data_event_mgr.register_data_event(self.get_ship_table_name(), protocol.GROUPED_DEL_DATA_NOTIFY, self._handle_ship_grouped_delete, self.reg_name)
data_event_mgr.register_data_event(ClientBattleTableID.CLIENT_BATTLE_SHIP, protocol.GROUPED_INSERT_DATA_NOTIFY, self._handle_ship_grouped_insert, self.reg_name)
data_event_mgr.register_data_event(ClientBattleTableID.CLIENT_BATTLE_SHIP, protocol.GROUPED_UPDATE_DATA_NOTIFY, self._handle_ship_grouped_update, self.reg_name)
data_event_mgr.register_data_event(ClientBattleTableID.CLIENT_BATTLE_SHIP, protocol.GROUPED_DEL_DATA_NOTIFY, self._handle_ship_grouped_delete, self.reg_name)
ShipAutoFixMgr = ShipAutoFixMgr
import data_manager.ship_auto_fix_mgr
ShipAutoFixMgr().register_data_event(SHIP_ESTIMATE, protocol.UPDATE_DATA_NOTIFY, self._handle_ship_estimate_update, self.reg_name)
