# Source Generated with Decompyle++
# File: check_io_trade_area.pyc (Python 3.11)

IO_STAR_TRADE_AREA_RADIUS = IO_STAR_TRADE_AREA_RADIUS
SITUATION_TRADE_WORLD_ITEM = SITUATION_TRADE_WORLD_ITEM
import common.config.configdata
for wid in six.iterkeys(SITUATION_TRADE_WORLD_ITEM):
    center_pos = map_utils.wid_to_index_g2(wid)
    radius = IO_STAR_TRADE_AREA_RADIUS
    (min_x, max_x, min_y, max_y) = (center_pos[0] - radius, center_pos[0] + radius, center_pos[1] - radius, center_pos[1] + radius)
    if  <= min_x, pos[0] or min_x, pos[0] <= max_x:
        pass
    
    if  <= min_y, pos[1] or min_y, pos[1] <= max_y:
        pass
    
    return True
    return False
