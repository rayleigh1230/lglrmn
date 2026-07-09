# Source Generated with Decompyle++
# File: _handle_fort_boss_info_grouped_update.pyc (Python 3.11)

for _, update_record, replace_record in grouped_data:
    if RaiderFortBossInfoField.POS in update_record:
        if update_record[RaiderFortBossInfoField.POS] == 0:
            self.world_boss_block_index.delete_item(update_record[RaiderFortBossInfoField.ID])
            continue
        idx_g2 = map_utils.wid_to_index_g2(update_record[RaiderFortBossInfoField.POS])
        self.world_boss_block_index.insert_item(idx_g2, update_record[RaiderFortBossInfoField.ID])
    return None
