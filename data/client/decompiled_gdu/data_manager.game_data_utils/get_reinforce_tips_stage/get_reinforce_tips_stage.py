# Source Generated with Decompyle++
# File: get_reinforce_tips_stage.pyc (Python 3.11)

data = get_user_red_dot_data(UserRedDotField.Type.TYPE_PERMANENT, UserRedDotField.Permanent.PERMANENT_REINFORCE_ASSIST)
if data:
    return int(data)
