# Source Generated with Decompyle++
# File: get_full_ship_id_by_painting_id.pyc (Python 3.11)

painting_config = Tb_cfg_painting.get(painting_id)
if not painting_config:
    return 0
if None[Tb_cfg_painting.SHIP_ID]:
    return painting_config[Tb_cfg_painting.SHIP_ID]
