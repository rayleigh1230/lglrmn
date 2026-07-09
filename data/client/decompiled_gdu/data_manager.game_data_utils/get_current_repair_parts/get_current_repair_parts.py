# Source Generated with Decompyle++
# File: get_current_repair_parts.pyc (Python 3.11)

user_city_record = GameDataMgr().get_record(TableID.USER_CITY, building_id_u)
if not user_city_record:
    if get_extra_info:
        return (None, None, None)
    return None
repair_parts = None(user_city_record[UserCityField.REPAIR_PARTS], is_num = True)
(_cur, _add, _max, _time, _out) = (repair_parts[0], repair_parts[1], repair_parts[2], repair_parts[3], repair_parts[4])
_max -= _out
if get_extra_info:
    return (int(_cur), _add, _max)
return None(_cur)
