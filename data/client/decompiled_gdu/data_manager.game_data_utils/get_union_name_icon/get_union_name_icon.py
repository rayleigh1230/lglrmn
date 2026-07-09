# Source Generated with Decompyle++
# File: get_union_name_icon.pyc (Python 3.11)

union_utils = union_utils
import data_manager.union
if union_utils.is_in_union():
    return (union_utils.get_self_union_name(), ui_res.BUILDING_UNION_ICON)
return (None, ui_res.BUILDING_UNION_ICON)
