# Source Generated with Decompyle++
# File: _init_nearest_activity_id.pyc (Python 3.11)

game_data_utils = game_data_utils
import data_manager
activity_data_base_utils = activity_data_base_utils
import data.activity
for cur_version in activity_id_config.AcitvityIdVersion.THEMATIC_VERSION_LIST:
    config = Tb_cfg_activity_version.get(cur_version)
    thematic_type = config[Tb_cfg_activity_version.THEMATIC_TYPE]
    play_ids = game_data_utils.parse_cfg_str_to_list(config[Tb_cfg_activity_version.PLAY_IDS], is_num = True)
    main_activity_id = None
    for play_id in play_ids:
        activity_id = activity_data_base_utils.get_activity_id(cur_version, play_id)
        play_config = Tb_cfg_activity_play.get(play_id)
        if not play_config:
            print('----------->>error, _init_nearest_activity_id, play_config is None, play_id: ', play_id)
            continue
        if play_config[Tb_cfg_activity_play.PLAY_TYPE] == activity_sys_type.TYPE_MAIN:
            main_activity_id = activity_id
        self._add_activity_id(activity_id, check_precondition = False)
        if not main_activity_id:
            print('----------->>error, _init_nearest_activity_id, main_activity_id is None')
    activity_id_config_refresh = activity_id_config_refresh
    import common.config
    activity_id_config_refresh.refresh_activity_id_config(thematic_type, main_activity_id)
    return None
