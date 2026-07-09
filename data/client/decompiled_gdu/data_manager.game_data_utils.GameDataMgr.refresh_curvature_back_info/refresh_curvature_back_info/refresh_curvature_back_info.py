# Source Generated with Decompyle++
# File: refresh_curvature_back_info.pyc (Python 3.11)

parse_cfg_str_to_list = parse_cfg_str_to_list
import data_manager.game_data_utils
record = self.get_record(TableID.SYS_CITY, SysCityField.Id.ID_IO_CURVATURE_BACK_POINT_PUBLIC)
if record:
    curvature_back_data = set(parse_cfg_str_to_list(record[SysCityField.INFO], True))
    items_to_delete = self.curvature_back_list.difference(curvature_back_data)
    for delete_wid in items_to_delete:
        self.delete_curvature_back_record(delete_wid)
        items_to_add = curvature_back_data.difference(self.curvature_back_list)
        for add_wid in items_to_add:
            self.insert_curvature_back_record(add_wid, is_open = True)
            GameEventManager().notify('curvature_back_data_update')
            return None
