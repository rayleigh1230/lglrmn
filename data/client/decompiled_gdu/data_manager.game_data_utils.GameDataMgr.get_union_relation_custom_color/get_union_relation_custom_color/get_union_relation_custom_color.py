# Source Generated with Decompyle++
# File: get_union_relation_custom_color.pyc (Python 3.11)

relation = self.get_union_relation(target_union_id)
self_user_record = self.get_record(TableID.USER, self.user_id)
if self_user_record:
    union_id = self_user_record[UserField.UNION_ID]
    if union_id and union_id == target_union_id:
        return 1
    color_idx = None.union_relation_custom_color[union_id].get(target_union_id)
    if color_idx == 0:
        if relation == UnionRelationSignField.Relation.RELATION_SIGN_ENEMY:
            color_idx = 2
        else:
            color_idx = 1
    return color_idx
