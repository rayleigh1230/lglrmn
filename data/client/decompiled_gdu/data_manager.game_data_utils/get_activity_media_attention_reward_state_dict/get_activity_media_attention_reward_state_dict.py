# Source Generated with Decompyle++
# File: get_activity_media_attention_reward_state_dict.pyc (Python 3.11)

community_record = GameDataMgr().get_record(TableID.USER_COMMUNITY, GameDataMgr().user_id)
reward_state_dict = { } if community_record else parse_cfg_str_to_dict_2(community_record[UserCommunityField.MEDIA_ATTENTION_REWARD], is_num = True)
return reward_state_dict
