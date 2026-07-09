# Source Generated with Decompyle++
# File: get_union_relation.pyc (Python 3.11)

self_user_record = self.get_record(TableID.USER, self.user_id)
if self_user_record:
    union_id = self_user_record[UserField.UNION_ID]
    if union_id and union_id == target_union_id:
        return UnionRelationField.Relation.RELATION_SELF
    return None.union_relation_dict[union_id].get(target_union_id)
