# Source Generated with Decompyle++
# File: get_produce_ship_res_info_details.pyc (Python 3.11)

ship_utils = ship_utils
import common
bp_record = self.blueprint_record
cost_list = ship_utils.get_ship_res_cost_details(bp_record, system_scheme_id_u = system_scheme_id_u)
cost_metal = cost_list[0] * produce_num
cost_crystal = cost_list[1] * produce_num
cost_deuterium = cost_list[2] * produce_num
addtional_system_num = cost_list[3]
produce_res_cost_ratio = cost_list[4]
peak_level_ratio = cost_list[5]
produce_res_cost_ratio += peak_level_ratio
user_res_list = game_data_utils.get_estimate_user_res_list()
enough_metal = cost_metal <= user_res_list[0]
enough_crystal = cost_crystal <= user_res_list[1]
enough_deuterium = cost_deuterium <= user_res_list[2]
return ([
    cost_metal,
    cost_crystal,
    cost_deuterium], [
    enough_metal,
    enough_crystal,
    enough_deuterium], addtional_system_num, produce_res_cost_ratio)
