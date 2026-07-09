# Source Generated with Decompyle++
# File: get_user_neutral_tip_num.pyc (Python 3.11)

if not is_user_neutral_friendly():
    return 0
outpost_ids = None(get_user_neutral_contract_cooperation_communicating_outpost_ids().keys())
return get_user_neutral_npc_tip_num(outpost_ids) + get_user_npc_outpost_notify_tip_num(outpost_ids) + get_user_npc_target_tip_num(outpost_ids)
