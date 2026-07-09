# Source Generated with Decompyle++
# File: get_relation.pyc (Python 3.11)

if not strategy:
    pass
strategy = BaseStratege()
if table_id == TableID.TEAM_PLAY:
    return RELATION_SELF
if not None:
    return RELATION_ENEMY
cur_frame = None.tick_counter
if cur_frame != _get_relation_cache_frame:
    _get_relation_cache = { }
    _get_relation_cache_frame = cur_frame
cache_key = (id(record), cfg_key, need_check_neutral_communicating)
cached = _get_relation_cache.get(cache_key, _CACHE_MISS)
if cached is not _CACHE_MISS:
    return cached
result = None(table_id, record, cfg_key, need_check_neutral_communicating, strategy = strategy)
_get_relation_cache[cache_key] = result
return result
