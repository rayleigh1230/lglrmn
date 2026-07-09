# Source Generated with Decompyle++
# File: delete_client_battle_ship_record.pyc (Python 3.11)

GameDataMgr = GameDataMgr
import data_manager.game_data_mgr
ClientBattleTableID = ClientBattleTableID
import data.battle.client_battle_data
return GameDataMgr().delete_record(ClientBattleTableID.CLIENT_BATTLE_SHIP, ship_id_u, notify = notify)
