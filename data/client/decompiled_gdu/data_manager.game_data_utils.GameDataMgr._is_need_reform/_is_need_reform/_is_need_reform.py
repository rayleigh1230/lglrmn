# Source Generated with Decompyle++
# File: _is_need_reform.pyc (Python 3.11)

time_utils = time_utils
import common
if ShipField.REFORMING_END_TIME in ship_record:
    pass
return ship_record[ShipField.REFORMING_END_TIME] > time_utils.get_server_time()
