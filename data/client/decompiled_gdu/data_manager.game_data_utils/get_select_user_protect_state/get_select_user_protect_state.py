# Source Generated with Decompyle++
# File: get_select_user_protect_state.pyc (Python 3.11)

select_state = select_state
import strategy.touch_event_handler
if select_type == select_state.SELECT_TYPE_BUILDING:
    item_id = select_info.get('key')
    item_record = GameDataMgr().get_record(TableID.WORLD_ITEM, item_id)
    if item_record:
        protect_type = int(item_record[WorldItemField.STATE])
        return protect_type
    return None
