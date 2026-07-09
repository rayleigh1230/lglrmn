# Source Generated with Decompyle++
# File: _handle_union_relation_update.pyc (Python 3.11)

full_record = self.get_record(TableID.UNION_RELATION, update_record[UnionRelationField.ID])
if full_record:
    self.update_union_relation(full_record)
    return None
