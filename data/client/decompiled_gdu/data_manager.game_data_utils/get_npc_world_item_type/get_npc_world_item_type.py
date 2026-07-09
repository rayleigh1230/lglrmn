# Source Generated with Decompyle++
# File: get_npc_world_item_type.pyc (Python 3.11)

NPC_CITY_LARGE = NPC_CITY_LARGE
NPC_CITY_MID = NPC_CITY_MID
NPC_CITY_PORT = NPC_CITY_PORT
NPC_CITY_SMALL = NPC_CITY_SMALL
NPC_CITY_STARGATE = NPC_CITY_STARGATE
import strategy.world_item.world_item_icon_entity.npc_city_icon_entity
T = WorldItemField.Type
if item_type == T.TYPE_NPC_STARGATE:
    return NPC_CITY_STARGATE
if None in (T.TYPE_NPC_CITY, T.TYPE_NPC_CITY_SINGLE, T.TYPE_RUINS, T.TYPE_SMALL_RUIN, T.TYPE_BATTLE_FORT):
    if level <= 3:
        pass
    elif level <= 6:
        pass
    
    return NPC_CITY_LARGE
if None in (T.TYPE_NPC_DEFENCE_PORT, T.TYPE_NPC_TRADE_PORT):
    return NPC_CITY_PORT
