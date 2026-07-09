# Source Generated with Decompyle++
# File: is_building_in_expanding_state.pyc (Python 3.11)

if item_record:
    if WorldItemField.STATE in item_record:
        pass
return item_record[WorldItemField.STATE] == WorldItemField.State.STATE_UNFOLD_SUB_BASE
