# Source Generated with Decompyle++
# File: get_common_relation.pyc (Python 3.11)

if union_id:
    cfg_story_relation = get_cfg_relation(union_id)
    if cfg_story_relation:
        return cfg_story_relation
    gdm = None()
    if user_id == gdm.user_id:
        return RELATION_SELF
    if None in gdm.union_user_list:
        return RELATION_FRIEND
    relation = None
    self_league_member_record = gdm.get_record(TableID.LEAGUE_MEMBER_USER, gdm.user_id)
    if self_league_member_record:
        self_user_record = gdm.get_record(TableID.USER, gdm.user_id)
        self_union_id = self_user_record[UserField.UNION_ID]
        if self_union_id != union_id:
            union_utils = union_utils
            import data_manager.union
            if union_utils.is_other_player_relation_league_share(user_id, union_id, league_id):
                return RELATION_LEAGUE_WITH_SHARE
            if None:
                league_member_cfg = gdm.get_record(TableID.LEAGUE_MEMBER_USER, gdm.user_id)
                if league_member_cfg and league_member_cfg[LeagueMemberUserField.LEAGUE_ID] != 0 and league_id == league_member_cfg[LeagueMemberUserField.LEAGUE_ID]:
                    return RELATION_LEAGUE_MEMBER
            LeagueDataMgr = LeagueDataMgr
            import data_manager.league.league_data_mgr
            league_union_list = LeagueDataMgr().get_contain_union_id_list()
            if union_id in league_union_list:
                return RELATION_LEAGUE_MEMBER
if union_id:
    if is_l5_refuge_union(union_id):
        return RELATION_L5_REFUGE_NPC
    if None(union_id):
        return RELATION_L5_PIRATE_NPC
    if None(union_id):
        return RELATION_ENEMY_NPC
    relation_custom_color = None.get_union_relation_custom_color(union_id)
    if not relation_custom_color:
        cross_conquer_utils = cross_conquer_utils
        import data_manager.cross_conquer
        if not user_id and cross_conquer_utils.is_same_server_with_me(user_id):
            return RELATION_ENEMY_CROSS_CONQUER
        if not None and cross_conquer_utils.is_same_original_server_union(union_id) and is_l5_refuge_union(union_id):
            return RELATION_ENEMY_CROSS_CONQUER
        if not None and cross_conquer_utils.is_same_original_server_league(league_id):
            return RELATION_ENEMY_CROSS_CONQUER
        if None == 0:
            pass
return relation
