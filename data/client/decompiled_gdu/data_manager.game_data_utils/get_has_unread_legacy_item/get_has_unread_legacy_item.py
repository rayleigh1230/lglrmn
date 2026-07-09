# Source Generated with Decompyle++
# File: get_has_unread_legacy_item.pyc (Python 3.11)

legacy_item_table = GameDataMgr().get_table(TableID.LEGACY_ITEM)
for _idu, record in six.iteritems(legacy_item_table):
    if not record[LegacyItemField.READ]:
        return True
    return False
