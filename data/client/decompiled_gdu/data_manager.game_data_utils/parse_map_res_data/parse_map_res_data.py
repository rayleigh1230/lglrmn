# Source Generated with Decompyle++
# File: parse_map_res_data.pyc (Python 3.11)

if map_res_data:
    if map_res_data[0] == [
        0,
        0,
        0,
        '']:
        (base_x, base_y, width, height, exist_data, inited_data) = map_res_data[1]
        base_x *= 64
        bit_per_row = width * 64
        result_list = []
        res_wid_set = set()
        bit_count = 0
        for int64_exist, int64_inited in zip(exist_data, inited_data):
            if int64_exist == 0:
                bit_count += 64
                continue
            i_y = bit_count / bit_per_row
            str_bin_inited = bin(int64_inited)
            str_bin_inited_end_idx = len(str_bin_inited) - 1
            inited_start_bit_idx = 2 if str_bin_inited[0] != '-' else 3
            for index, bit_value in enumerate(__int64_to_bit(int64_exist)):
                if bit_value == '1':
                    i_x = (bit_count + index) % bit_per_row
                    inited_idx = str_bin_inited_end_idx - index
                    if inited_idx < inited_start_bit_idx:
                        is_inited = 0
                    elif str_bin_inited[inited_idx] == '1':
                        pass
                    
                    is_inited = 0
                    wid = map_utils.index_g3_to_wid((1, base_x + i_x, base_y + i_y))
                    res_wid_set.add(wid)
                    result_list.append({
                        MapResField.INITED: is_inited,
                        MapResField.CUR: 1,
                        MapResField.ID: wid })
                bit_count += 64
                GameEventManager().notify('new_map_res_data', res_wid_set, base_x, base_y, base_x + bit_per_row, base_y + height)
                return result_list
                return parse_list_to_dic(map_res_data, MapResField.WORLD_VIEW_FIELDS)
                return []
