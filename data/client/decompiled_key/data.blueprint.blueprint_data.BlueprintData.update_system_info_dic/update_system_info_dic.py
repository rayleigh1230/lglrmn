# Source Generated with Decompyle++
# File: update_system_info_dic.pyc (Python 3.11)

get_show_enhance_info = get_show_enhance_info
import ui.ship_blueprint.bp_ui_utils
all_system_dict = { }
system_list = blueprint_utils.get_blueprint_all_using_system(self.blueprint_record)
bp_overview_record = blueprint_utils.get_bp_overview_record(self.ship_id)
cur_enhance_str = self.blueprint_record[ShipBlueprintField.EFFECTS_ENHANCED]
peak_level = blueprint_utils.get_peak_level(self.ship_id)
for system_id in system_list:
    (total_slot_num, enhance_list) = get_show_enhance_info(system_id, cur_enhance_str, peak_level)
    can_enhance = blueprint_utils.ship_system_can_enhance_by_record(self.blueprint_record, bp_overview_record, system_id)
    all_system_dict[system_id] = {
        'can_enhance': can_enhance,
        'total_slot_num': total_slot_num,
        'used_slot_num': len(enhance_list) }
    self._system_info_dic = all_system_dict
    return None
