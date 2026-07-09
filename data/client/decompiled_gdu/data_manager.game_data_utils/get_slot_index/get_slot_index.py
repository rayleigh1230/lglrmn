# Source Generated with Decompyle++
# File: get_slot_index.pyc (Python 3.11)

system_id = slot_id / CfgShipField.Prefix.PREFIX_SYSTEM_ID_TO_SLOT
ship_slot_id_list = SYSTEM_ID_TO_SLOT_ID_LIST[system_id]
ship_slot_id_list.sort()
for index, _slot_id in enumerate(ship_slot_id_list):
    if _slot_id == slot_id:
        
        return None, index + 1
    return slot_id % CfgShipField.Prefix.PREFIX_SYSTEM_ID_TO_SLOT
