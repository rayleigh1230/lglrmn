# Source Generated with Decompyle++
# File: get_same_type_ship_data.pyc (Python 3.11)

if ship_lst:
    for index, _ship_id in enumerate(ship_lst):
        if _ship_id / 100 == ship_id / 100:
            
            return None, (_ship_id, index)
        return (None, None)
