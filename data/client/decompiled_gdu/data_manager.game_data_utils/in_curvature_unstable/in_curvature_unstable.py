# Source Generated with Decompyle++
# File: in_curvature_unstable.pyc (Python 3.11)

r = configdata.IO_RETURN_POINT_RADIUS ** 2
(x1, y1) = p
for wid in GameDataMgr().curvature_back_list:
    (x2, y2) = map_utils.wid_to_index_g2(wid)
    if (x2 - x1) ** 2 + (y2 - y1) ** 2 <= r:
        return False
    return True
