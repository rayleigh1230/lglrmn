# Source Generated with Decompyle++
# File: module_info_list.pyc (Python 3.11)

modules_info_str = self.blueprint_record[ShipBlueprintField.MODULES]
if modules_info_str:
    game_data_utils = game_data_utils
    import data_manager
    return game_data_utils.parse_cfg_str_to_list_of_list(modules_info_str, True, [])
