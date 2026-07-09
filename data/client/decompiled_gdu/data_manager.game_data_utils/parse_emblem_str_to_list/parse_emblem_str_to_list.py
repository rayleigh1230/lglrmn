# Source Generated with Decompyle++
# File: parse_emblem_str_to_list.pyc (Python 3.11)

emblem_data = parse_cfg_str_to_list_with_empty_str(emblem_str, is_cache)
emblem_data = [
    int(emblem_data[0]),
    int(emblem_data[1]),
    int(emblem_data[2]),
    int(emblem_data[3]),
    emblem_data[4] if len(emblem_data) > 4 else None,
    emblem_data[5] if len(emblem_data) > 5 else '0']
return emblem_data
