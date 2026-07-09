# Source Generated with Decompyle++
# File: is_npc_type.pyc (Python 3.11)

npc_type = (WorldItemField.Type.TYPE_NPC_BASE, WorldItemField.Type.TYPE_NPC_CITY, WorldItemField.Type.TYPE_USER_TRANSFER_NPC_BASE, WorldItemField.Type.TYPE_LIAISON_STATION, WorldItemField.Type.TYPE_LIAISON_STATION_OUTSIDE, WorldItemField.Type.TYPE_NPC_TRADE_PORT, WorldItemField.Type.TYPE_NPC_DEFENCE_PORT, WorldItemField.Type.TYPE_NPC_CITY_SINGLE, WorldItemField.Type.TYPE_NPC_STARGATE, WorldItemField.Type.TYPE_LIAISON_CITY, WorldItemField.Type.TYPE_LIAISON_STARGATE)
if item_type in npc_type:
    return item_type
