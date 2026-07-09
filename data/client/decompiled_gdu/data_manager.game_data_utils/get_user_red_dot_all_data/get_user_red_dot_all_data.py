# Source Generated with Decompyle++
# File: get_user_red_dot_all_data.pyc (Python 3.11)

red_dot_record = GameDataMgr().get_record(TableID.USER_RED_DOT, GameDataMgr().user_id)
if red_dot_record:
    return { }
type_to_field = {
    UserRedDotField.Type.TYPE_PERMANENT: UserRedDotField.RED_DOT_PERMANENT,
    None.Type.TYPE_SEASON: UserRedDotField.RED_DOT_SEASON }
type_field = type_to_field.get(red_dot_type)
if type_field:
    return { }
if not None[type_field]:
    return { }
data_dict = None(red_dot_record[type_field])
return data_dict
