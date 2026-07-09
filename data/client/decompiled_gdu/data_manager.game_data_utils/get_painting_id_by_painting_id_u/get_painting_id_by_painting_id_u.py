# Source Generated with Decompyle++
# File: get_painting_id_by_painting_id_u.pyc (Python 3.11)

if painting_id_u:
    record = GameDataMgr().get_record(TableID.USER_PAINTING, painting_id_u)
    if record:
        return record.get(UserPaintingField.PAINTING_ID)
    default_painting = None()
    painting_id = default_painting
    return painting_id
default_painting = None()
painting_id = default_painting
return painting_id
