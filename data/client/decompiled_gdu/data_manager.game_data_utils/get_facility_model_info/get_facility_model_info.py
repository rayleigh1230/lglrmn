# Source Generated with Decompyle++
# File: get_facility_model_info.pyc (Python 3.11)

utils = utils
import common
facility_lv_attr_record = cfg_facility_level_attr.get(facility_id * 100 + level)
if facility_lv_attr_record:
    model_files_str = facility_lv_attr_record[cfg_facility_level_attr.MODEL]
    model_socket_str = facility_lv_attr_record[cfg_facility_level_attr.MODEL_SOCKET]
    bp_model_files_str = facility_lv_attr_record[cfg_facility_level_attr.MODEL_BLUEPRINT]
    updating_model_files_str = facility_lv_attr_record[cfg_facility_level_attr.MODEL_ING]
    model_info_groups = []
    
    def <listcomp>(.0):
        pass
    # WARNING: Decompyle incomplete

    
    def <listcomp>(.0):
        pass
    # WARNING: Decompyle incomplete

    for model_file_group_str, model_socket_group_str, bp_model_file_group_str, updating_model_file_group_str in model_socket_str.split(';')()(<listcomp>, bp_model_files_str.split(';')(), <listcomp>, updating_model_files_str.split(';')()):
        model_info = collections.OrderedDict()
        model_info_groups.append(model_info)
        
        def <listcomp>(.0 = None):
            pass
        # WARNING: Decompyle incomplete

        for model_file, model_socket, bp_model_file, updating_model_file in None(None, None, <listcomp>, updating_model_file_group_str.split(',')()):
            model_info[(model_file, model_socket)] = (model_file, bp_model_file, updating_model_file, model_socket)
            return model_info_groups
            return []
