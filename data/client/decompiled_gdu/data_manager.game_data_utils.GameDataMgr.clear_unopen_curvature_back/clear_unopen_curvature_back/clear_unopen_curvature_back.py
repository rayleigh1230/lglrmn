# Source Generated with Decompyle++
# File: clear_unopen_curvature_back.pyc (Python 3.11)

unopen_items = self.curvature_back_list.difference(self.open_curvature_back_list)
for wid in unopen_items:
    self.delete_curvature_back_record(wid)
    return None
