# Source Generated with Decompyle++
# File: _handle_fort_boss_info_grouped_insert.pyc (Python 3.11)

for _, insert_record in grouped_data:
    if insert_record[RaiderFortBossInfoField.POS] == 0:
        continue
    idx_g2 = map_utils.wid_to_index_g2(insert_record[RaiderFortBossInfoField.POS])
    self.world_boss_block_index.insert_item(idx_g2, insert_record[RaiderFortBossInfoField.ID])
    return None
