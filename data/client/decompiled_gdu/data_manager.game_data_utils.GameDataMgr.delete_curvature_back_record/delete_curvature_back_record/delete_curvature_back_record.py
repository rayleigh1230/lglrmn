# Source Generated with Decompyle++
# File: delete_curvature_back_record.pyc (Python 3.11)

if wid in self.curvature_back_list:
    self.curvature_back_list.remove(wid)
    self.curvature_back_block_index.delete_item(wid)
if wid in self.open_curvature_back_list:
    self.open_curvature_back_list.remove(wid)
    return None
