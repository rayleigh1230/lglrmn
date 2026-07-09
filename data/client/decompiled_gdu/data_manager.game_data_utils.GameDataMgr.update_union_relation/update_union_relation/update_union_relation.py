# Source Generated with Decompyle++
# File: update_union_relation.pyc (Python 3.11)

union_id = record[UnionRelationField.UNION_ID]
target_union_id = record[UnionRelationField.TARGET_UNION_ID]
relation = record[UnionRelationField.RELATION]
self.union_relation_dict[union_id][target_union_id] = relation
GameEventManager().notify('union_relation_update', union_id, target_union_id, relation)
