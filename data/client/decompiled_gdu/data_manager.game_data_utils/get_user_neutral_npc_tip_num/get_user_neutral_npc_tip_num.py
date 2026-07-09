# Source Generated with Decompyle++
# File: get_user_neutral_npc_tip_num.pyc (Python 3.11)

num = 0
for key, record in six.iteritems(GameDataMgr().get_table(TableID.USER_NPC_MISSION)):
    if record[UserNpcMissionField.STATE] == UserNpcMissionField.State.STATE_COMPLETE or record[UserNpcMissionField.STATE] == UserNpcMissionField.State.STATE_WAIT_REWARDS_TEAM:
        continue
    if record[UserNpcMissionField.USERID] != GameDataMgr().user_id:
        continue
    if record[UserNpcMissionField.MISSION_LIAISON_ID] not in outpost_ids:
        continue
    if record[UserNpcMissionField.MISSION_FROM_TYPE] == UserNpcMissionField.FromType.FROM_TYPE_NEUTRALITY:
        if record[UserNpcMissionField.READ] != UserNpcMissionField.ReadState.READ_STATE_READ:
            num += 1
            continue
        if record[UserNpcMissionField.STATE] == UserNpcMissionField.State.STATE_COMPLETE:
            num += 1
continue
return num
