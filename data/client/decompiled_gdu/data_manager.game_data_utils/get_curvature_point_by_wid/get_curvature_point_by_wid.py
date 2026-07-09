# Source Generated with Decompyle++
# File: get_curvature_point_by_wid.pyc (Python 3.11)

if not sys_param_utils.is_io_season() or in_io_galaxy_area(index_g2):
    return None
curvature_wid = None
r = configdata.IO_RETURN_POINT_RADIUS ** 2
(x1, y1) = index_g2
for wid in GameDataMgr().curvature_back_list:
    (x2, y2) = map_utils.wid_to_index_g2(wid)
    if (x2 - x1) ** 2 + (y2 - y1) ** 2 <= r:
        curvature_wid = wid
    return curvature_wid
