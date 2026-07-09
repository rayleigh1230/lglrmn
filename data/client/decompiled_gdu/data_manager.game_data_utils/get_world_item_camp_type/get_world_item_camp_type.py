# Source Generated with Decompyle++
# File: get_world_item_camp_type.pyc (Python 3.11)

gdm = GameDataMgr()
camp_type = CAMP_TYPE_ENEMY
user_id = item_record.get(WorldItemField.USERID)
if user_id == 0:
    ItemType = WorldItemField.Type
    city_type = (ItemType.TYPE_LIAISON_STATION, ItemType.TYPE_NPC_TRADE_PORT, ItemType.TYPE_NPC_DEFENCE_PORT, ItemType.TYPE_NPC_CITY)
    superior_user_id = item_record.get(WorldItemField.SUPERIOR_USERID)
    item_type = item_record.get(WorldItemField.ITEM_TYPE)
    if item_type in city_type:
        camp_type = CAMP_TYPE_NPC_CITY
        if superior_user_id == gdm.user_id:
            camp_type = CAMP_TYPE_NPC_CITY_SELF
        elif superior_user_id in gdm.union_user_list:
            camp_type = CAMP_TYPE_NPC_CITY_SAME_UNION
        elif superior_user_id != 0:
            camp_type = CAMP_TYPE_NPC_CITY_ENEMY
        else:
            camp_type = CAMP_TYPE_NPC
            if superior_user_id == gdm.user_id:
                camp_type = CAMP_TYPE_NPC_SELF
            elif superior_user_id in gdm.union_user_list:
                camp_type = CAMP_TYPE_NPC_SAME_UNION
            elif superior_user_id != 0:
                camp_type = CAMP_TYPE_NPC_ENEMY
            elif user_id == gdm.user_id:
                camp_type = CAMP_TYPE_SELF
            elif user_id in gdm.union_user_list:
                camp_type = CAMP_TYPE_FRIEND
return camp_type
