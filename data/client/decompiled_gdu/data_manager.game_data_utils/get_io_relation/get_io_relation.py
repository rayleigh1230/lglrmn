# Source Generated with Decompyle++
# File: get_io_relation.pyc (Python 3.11)

if union_id == GameDataMgr().get_record(TableID.USER, GameDataMgr().user_id)[UserField.UNION_ID]:
    return RELATION_SELF
if None != 0:
    return RELATION_ENEMY
