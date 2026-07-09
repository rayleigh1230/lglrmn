# Source Generated with Decompyle++
# File: get_feature_effect_showed.pyc (Python 3.11)

if feature_id not in common_definition.FEATURE_TO_SHOW_EFFECT:
    return True
if None.is_first_season() and feature_id in common_definition.ONLY_L0_FEATURE:
    return True
flag_index = None.FEATURE_TO_SHOW_EFFECT.index(feature_id)
red_dot_data = get_user_red_dot_data(UserRedDotField.Type.TYPE_SEASON, UserRedDotField.Season.SEASON_FUNCTION_UNLOCK)
if not red_dot_data:
    return False
red_dot_flags = None(red_dot_data)
return bool(red_dot_flags & 1 << flag_index)
