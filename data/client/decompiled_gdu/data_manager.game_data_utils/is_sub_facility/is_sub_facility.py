# Source Generated with Decompyle++
# File: is_sub_facility.pyc (Python 3.11)

cfg = Tb_cfg_facility.get(facility_id)
if cfg:
    return cfg[Tb_cfg_facility.UI_LEVEL] == 3
