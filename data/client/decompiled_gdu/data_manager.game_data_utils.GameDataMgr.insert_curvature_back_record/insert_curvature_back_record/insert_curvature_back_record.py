# Source Generated with Decompyle++
# File: insert_curvature_back_record.pyc (Python 3.11)

if wid in self.curvature_back_list:
    return None
grid_idx_g2 = None.wid_to_index_g2(wid)
if grid_idx_g2:
    self.curvature_back_list.add(wid)
    self.curvature_back_block_index.insert_item(grid_idx_g2, wid)
    if is_open:
        self.open_curvature_back_list.add(wid)
        return None
    return None
