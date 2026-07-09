# Source Generated with Decompyle++
# File: get_server_relation.pyc (Python 3.11)

gdm = GameDataMgr()
if user_id == gdm.user_id:
    return UnionRelationField.Relation.RELATION_ALLY
if None in gdm.union_user_list:
    return UnionRelationField.Relation.RELATION_ENEMY
union_relation = None
if union_id:
    if is_l5_refuge_union(union_id):
        return RELATION_L5_REFUGE_NPC
    if None(union_id):
        return RELATION_L5_PIRATE_NPC
    if None == 0:
        gdm = GameDataMgr()
        if union_id and is_player_union(union_id) or is_pirate_union(union_id):
            if superior_user_id == gdm.user_id:
                union_relation = UnionRelationField.Relation.RELATION_SELF
            elif superior_user_id in gdm.union_user_list:
                union_relation = UnionRelationField.Relation.RELATION_SELF
            elif union_id:
                union_relation = gdm.get_union_relation(union_id)
            else:
                return UnionRelationField.Relation.RELATION_ENEMY
            union_relation = None.get_union_relation(union_id)
        else:
            union_relation = gdm.get_union_relation(union_id)
if union_relation:
    return UnionRelationField.Relation.RELATION_NONE
