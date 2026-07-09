# Source Generated with Decompyle++
# File: is_home_base_or_branch.pyc (Python 3.11)

if item_record[WorldItemField.ITEM_TYPE] in (WorldItemField.Type.TYPE_PLAYER_BASE, WorldItemField.Type.TYPE_PLAYER_BRANCH_BASE):
    pass
return item_record.get(WorldItemField.STATE) not in (WorldItemField.State.STATE_BUILDING, WorldItemField.State.STATE_BUILD_CANCELLING)
