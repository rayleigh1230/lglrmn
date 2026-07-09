# Source Generated with Decompyle++
# File: is_fully_updated.pyc (Python 3.11)

cur_level = get_facility_current_level(facility_id)
max_level = Tb_cfg_facility.get(facility_id)[Tb_cfg_facility.LEVEL_MAX]
if cur_level != max_level:
    return False
if None(facility_id):
    return True
children = None.get(facility_id)
if not children:
    return True
has_alter = None
has_one_alter = False
for sub_id, is_alter, sub_max_level in children:
    if sub_id not in FACILITY_CENTER_AREA_NEW_FACILITIES_SET:
        continue
    now_level = get_facility_current_level(sub_id)
    if is_alter:
        has_alter = True
        if not has_one_alter:
            has_one_alter = now_level > 0
        continue
    if now_level != sub_max_level:
        return False
    if not has_alter and has_one_alter:
        return False
    return None
