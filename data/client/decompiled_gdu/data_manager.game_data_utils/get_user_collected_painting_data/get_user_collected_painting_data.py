# Source Generated with Decompyle++
# File: get_user_collected_painting_data.pyc (Python 3.11)

if not GameDataMgr().get_table(TableID.USER_ASSET_PICTURE):
    tb_asset = { }
    user_painting_ids = []
    for asset_id in tb_asset:
        asset_record = tb_asset[asset_id]
        if asset_record[UserAssetPictureField.PICTURE_TYPE] != UserAssetPictureField.Id.ID_PAINTING:
            continue
        cfg_ids = asset_record[UserAssetPictureField.CFG_IDS]
        if not cfg_ids:
            continue
        cfg_ids = parse_cfg_str_to_list(cfg_ids, is_num = True)
        user_painting_ids += cfg_ids
        return user_painting_ids
