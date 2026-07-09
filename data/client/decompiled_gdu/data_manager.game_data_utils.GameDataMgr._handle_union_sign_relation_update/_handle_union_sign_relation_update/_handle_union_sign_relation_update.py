# Source Generated with Decompyle++
# File: _handle_union_sign_relation_update.pyc (Python 3.11)

full_record = self.get_record(TableID.UNION_RELATION_SIGN, update_record[UnionRelationSignField.ID])
if full_record:
    self.update_union_sign_relation(full_record)
    return None
