# Source Generated with Decompyle++
# File: update_union_sign_relation.pyc (Python 3.11)

union_id = record[UnionRelationSignField.UNION_ID]
target_union_id = record[UnionRelationSignField.TARGET_UNION_ID]
relation = record[UnionRelationSignField.RELATION]
custom_color = record[UnionRelationSignField.COLOR]
self.union_relation_dict[union_id][target_union_id] = relation
self.union_relation_custom_color[union_id][target_union_id] = custom_color
GameEventManager().notify('union_relation_update', union_id, target_union_id, relation)
