# Source Generated with Decompyle++
# File: get_l4_ruin_city_by_wid.pyc (Python 3.11)

WORLD_ITEM_WID_TO_ID = WORLD_ITEM_WID_TO_ID
import common.preprocess_data
item_id = WORLD_ITEM_WID_TO_ID.get(wid, None)
if item_id:
    return self.l4_ruin_city_lst.get(item_id, None)
