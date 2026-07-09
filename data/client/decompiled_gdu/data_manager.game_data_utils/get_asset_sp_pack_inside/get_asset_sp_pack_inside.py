# Source Generated with Decompyle++
# File: get_asset_sp_pack_inside.pyc (Python 3.11)

cfg_pack = Tb_cfg_asset_pack.get(pack_id)
rewards = cfg_pack[Tb_cfg_asset_pack.REWARD]
if not rewards:
    return (None, None)
reward = None(rewards, is_num = True)
return (reward[0], reward[1])
