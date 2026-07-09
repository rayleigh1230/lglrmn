# Source Generated with Decompyle++
# File: get_circulated_item_record_by_unique_id.pyc (Python 3.11)

if item_type not in circulate_item_dict or item_config_id not in circulate_item_dict[item_type]:
    return None
for record in None[item_type][item_config_id]:
    if record[CirculatedItemsField.UNIQUE_ID] == unique_id:
        
        return None, record
    return None
