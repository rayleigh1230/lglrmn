# Source Generated with Decompyle++
# File: in_io_galaxy_area.pyc (Python 3.11)

if STAR_CFG_DATA or len(STAR_CFG_DATA) != 3:
    return False
a = (None[0].g2_coord_x, STAR_CFG_DATA[0].g2_coord_y)
b = (STAR_CFG_DATA[1].g2_coord_x, STAR_CFG_DATA[1].g2_coord_y)
c = (STAR_CFG_DATA[2].g2_coord_x, STAR_CFG_DATA[2].g2_coord_y)
return is_point_in_triangle(p, [
    a,
    b,
    c])
