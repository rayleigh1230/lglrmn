# Source Generated with Decompyle++
# File: save_feature_effect_showed.pyc (Python 3.11)

if feature_id not in common_definition.FEATURE_TO_SHOW_EFFECT:
    return None
red_dot_data = None(UserRedDotField.Type.TYPE_SEASON, UserRedDotField.Season.SEASON_FUNCTION_UNLOCK)
if not red_dot_data:
    red_dot_flags = 0
else:
    red_dot_flags = int(red_dot_data)
flag_index = common_definition.FEATURE_TO_SHOW_EFFECT.index(feature_id)
red_dot_flags |= 1 << flag_index
save_user_red_dot_data(UserRedDotField.Type.TYPE_SEASON, UserRedDotField.Season.SEASON_FUNCTION_UNLOCK, str(red_dot_flags))
