# Source Generated with Decompyle++
# File: get_bp_table.pyc (Python 3.11)

if self.ship_bp_collection_id:
    _dic = { }
    GameDataMgr = GameDataMgr
    import data_manager.game_data_mgr
    for bp_id_u, bp_record in GameDataMgr().get_table(self.blueprint_table_name).items():
        if bp_record.get(ShipBlueprintGamePlayField.SHIP_BP_COLLECTION_ID) == self.ship_bp_collection_id:
            _dic[bp_id_u] = bp_record
        return _dic
        GameDataMgr = GameDataMgr
        import data_manager.game_data_mgr
        return GameDataMgr().get_table(self.blueprint_table_name)
