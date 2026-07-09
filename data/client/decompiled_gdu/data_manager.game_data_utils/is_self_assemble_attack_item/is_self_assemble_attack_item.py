# Source Generated with Decompyle++
# File: is_self_assemble_attack_item.pyc (Python 3.11)

record_dict = GameDataMgr().get_table(TableID.USER_ASSEMBLE)
for uid, record in six.iteritems(record_dict):
    if item_uid == record[UserAssembleField.TARGET_WORLD_ITEM_ID]:
        return True
    return False
