# Source Generated with Decompyle++
# File: get_stargate_facade.pyc (Python 3.11)

building_id = get_stargate_building_id()
stargate_item_record = GameDataMgr().get_record(TableID.WORLD_ITEM, building_id)
if stargate_item_record:
    return stargate_item_record[WorldItemField.FACADE]
PREPROCESSED_STARGATE_FACADE = PREPROCESSED_STARGATE_FACADE
import common.preprocess_data
return PREPROCESSED_STARGATE_FACADE
