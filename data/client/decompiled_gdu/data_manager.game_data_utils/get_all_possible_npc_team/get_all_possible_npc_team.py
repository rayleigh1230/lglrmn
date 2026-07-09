# Source Generated with Decompyle++
# File: get_all_possible_npc_team.pyc (Python 3.11)

_list = []
deal_id = npc_id / 100
if deal_id in SPECIAL_PRIVATEER_DEAL_ID_LIST:
    return [
        npc_id]
for key, info in None.iteritems(Tb_cfg_npc_team.get_all_data()):
    if key / 100 == deal_id:
        _list.append(key)
    return _list
