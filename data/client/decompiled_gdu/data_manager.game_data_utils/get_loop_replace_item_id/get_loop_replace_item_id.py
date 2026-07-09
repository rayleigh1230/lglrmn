# Source Generated with Decompyle++
# File: get_loop_replace_item_id.pyc (Python 3.11)

replace_item_id = item_cfg_id
if not cfg_record:
    return replace_item_id
purchase_goods = None[Tb_cfg_user_store_item.GOODS]
purchase_goods = parse_cfg_str_to_list_of_list(purchase_goods, True)
if purchase_goods and purchase_goods[0][0] in (CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK, CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK_SP):
    store_record = GameDataMgr().get_record(TableID.USER_STORE, GameDataMgr().user_id)
    if store_record:
        refresh_loop = store_record[UserStoreField.REFRESH_LOOP]
        store_goods_replace = get_store_goods_replace_item()
        if item_cfg_id in store_goods_replace:
            replace_item_id = store_goods_replace[item_cfg_id][refresh_loop]
return replace_item_id
