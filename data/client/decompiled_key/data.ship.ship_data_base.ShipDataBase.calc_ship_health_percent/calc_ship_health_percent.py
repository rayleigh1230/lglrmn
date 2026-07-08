# Source Generated with Decompyle++
# File: calc_ship_health_percent.pyc (Python 3.11)

if ship_health_max <= 0:
    return 0
if None <= 0:
    return 0
return None.clamp(ship_health * 100 / ship_health_max, 1, 100)
