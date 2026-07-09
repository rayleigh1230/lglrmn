# Source Generated with Decompyle++
# File: _handle_world_item_update.pyc (Python 3.11)

ship_utils = ship_utils
import common
if WorldItemField.SHIP_REPAIR_REFRESH_TIME in update_world_item_record:
    full_record = self.get_record(TableID.WORLD_ITEM, update_world_item_record[WorldItemField.ID])
    if full_record[WorldItemField.USERID] == self.user_id:
        for ship_id_u, ship_estimate_record in six.iteritems(self.get_table(SHIP_ESTIMATE)):
            ship_record = self.get_record(TableID.SHIP, ship_id_u)
            if ship_record:
                refresh_time = update_world_item_record[WorldItemField.SHIP_REPAIR_REFRESH_TIME]
                ship_estimate_record[SHIP_REPAIR_REFRESH_TIME] = refresh_time
                ship_estimate_record[SHIP_REPAIR_SERVER_REFRESH_TIME] = refresh_time
                (bind_drone_hp, bind_drone_max_hp) = ship_utils.get_bind_drone_hp_info(ship_record)
                ship_estimate_record[SHIP_SERVER_HP] = ship_record[ShipField.HP] + bind_drone_hp
            if WorldItemField.STATE in update_world_item_record:
                full_record = self.get_record(TableID.WORLD_ITEM, update_world_item_record[WorldItemField.ID])
                if full_record[WorldItemField.USERID] == self.user_id:
                    if old_record[WorldItemField.STATE] == WorldItemField.State.STATE_BASE_EXPANDING or update_world_item_record[WorldItemField.STATE] == WorldItemField.State.STATE_BASE_FOLD_HIDE:
                        self.refresh_all_ship_repair_record_when_base_expaned()
if not update_world_item_record.get(WorldItemField.POS):
    return None
world_item_id = None[TableKey[TableID.WORLD_ITEM]]
self.world_item_block_index.delete_item(world_item_id)
world_item_record = GameDataMgr().get_record(TableID.WORLD_ITEM, world_item_id)
self._handle_world_item_insert(world_item_record)
