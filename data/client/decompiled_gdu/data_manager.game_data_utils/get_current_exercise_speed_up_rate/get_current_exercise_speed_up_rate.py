# Source Generated with Decompyle++
# File: get_current_exercise_speed_up_rate.pyc (Python 3.11)

record = GameDataMgr().get_record(TableID.USER_STUFF_EXT, GameDataMgr().user_id)
if record:
    if record[UserStuffExtField.EXERCISE_BATTLE_SPEED] <= 1:
        return 1
    return None[UserStuffExtField.EXERCISE_BATTLE_SPEED]
