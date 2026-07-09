# Source Generated with Decompyle++
# File: get_registrant_listener_cnt.pyc (Python 3.11)

cnt = len(self._registrants.get(registrant, set()))
for cache_action in self._cached_actions:
    if cache_action.registrant == registrant:
        if cache_action.action_type == _CachedAction.ACTION_REGISTER:
            cnt += 1
            continue
        if cache_action.action_type == _CachedAction.ACTION_UNREGISTER:
            cnt -= 1
    return cnt
