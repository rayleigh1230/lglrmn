# Source Generated with Decompyle++
# File: on_system_destroy.pyc (Python 3.11)

if system_index == -1:
    return None
system_id = None.ship_id * CfgShipField.Prefix.PREFIX_SHIP_ID_TO_SYSTEM + system_index
if flag == 1:
    self._system_destroy_dict_in_battle[system_id] = True
elif flag == -1 and system_id in self._system_destroy_dict_in_battle:
    del self._system_destroy_dict_in_battle[system_id]
GameEventManager().notify('zoom0_ship_system_destroyed_status_changed', self.ship_uid, system_index, flag, self.has_system_destroyed)
