# Source Generated with Decompyle++
# File: get_team_camp_type.pyc (Python 3.11)

gdm = GameDataMgr()
camp_type = CAMP_TYPE_ENEMY
team_user_id = team_record[TeamField.USERID]
if team_user_id == 0:
    camp_type = CAMP_TYPE_NPC
    superior_user_id = team_record.get(TeamField.SUPERIOR_USERID)
    if superior_user_id == gdm.user_id:
        camp_type = CAMP_TYPE_NPC_SELF
    elif superior_user_id in gdm.union_user_list:
        camp_type = CAMP_TYPE_NPC_SAME_UNION
    elif team_user_id == gdm.user_id:
        camp_type = CAMP_TYPE_SELF
    elif team_user_id in gdm.union_user_list:
        camp_type = CAMP_TYPE_FRIEND
return camp_type
