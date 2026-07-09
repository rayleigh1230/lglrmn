# Source Generated with Decompyle++
# File: add_data_to_cache.pyc (Python 3.11)

cache_dict = self.cache_str_list[cache_type]
if cfg_data_key not in cache_dict:
    cache_dict[cfg_data_key] = cfg_data_result
    return None
