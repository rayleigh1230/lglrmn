# Source Generated with Decompyle++
# File: get_night_mode_cfg_data.pyc (Python 3.11)

point_rate = 0
curvature_rate = 0
recover_rate = 0
if night_state in night_mode_config.IN_NIGHT_STATES:
    config = Tb_cfg_night_mode.get(night_mode_config.NIGHT_MODE_NORMAL)
    if config:
        point_rate = config[Tb_cfg_night_mode.PLAN_POINT_RATE]
        curvature_rate = config[Tb_cfg_night_mode.CURVATURE_SLOW_DOWN_RATE]
        recover_rate = config[Tb_cfg_night_mode.SPACE_TEAM_RECOVER_REDUCE_RATE]
    if night_state == night_mode_config.NIGHT_MODE_LATE:
        late_cfg = Tb_cfg_night_mode.get(night_mode_config.NIGHT_MODE_LATE)
        if late_cfg:
            point_rate += late_cfg[Tb_cfg_night_mode.PLAN_POINT_RATE]
            curvature_rate += late_cfg[Tb_cfg_night_mode.CURVATURE_SLOW_DOWN_RATE]
            recover_rate += late_cfg[Tb_cfg_night_mode.SPACE_TEAM_RECOVER_REDUCE_RATE]
return (point_rate, curvature_rate, recover_rate)
