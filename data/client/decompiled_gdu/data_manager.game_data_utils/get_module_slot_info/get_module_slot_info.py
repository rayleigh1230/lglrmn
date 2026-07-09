# Source Generated with Decompyle++
# File: get_module_slot_info.pyc (Python 3.11)

slot_id = get_module_slot_id(ship_id, slot_index)
slot_info = Tb_cfg_ship_slot.get(slot_id)
if slot_info:
    return slot_info
