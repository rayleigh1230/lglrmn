# Source Generated with Decompyle++
# File: get_circulated_item_dict.pyc (Python 3.11)

table = GameDataMgr().get_table(TableID.CIRCULATED_ITEMS)
ret_dict = { }
unique_goods_dict = { }
for circulated_id, record in six.iteritems(table):
    item_type = record[CirculatedItemsField.ITEM_TYPE]
    unique_id = record[CirculatedItemsField.UNIQUE_ID]
    if item_type in (CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK, CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK_SP):
        if TableID.BP_RESEARCH_TREE_PACK not in unique_goods_dict:
            unique_goods_dict[TableID.BP_RESEARCH_TREE_PACK] = GameDataMgr().get_table_for_unique_key(TableID.BP_RESEARCH_TREE_PACK, BpResearchTreePackField.UNIQUE_PACK_ID)
        bp_record = unique_goods_dict[TableID.BP_RESEARCH_TREE_PACK].get(unique_id)
        if not bp_record:
            continue
        item_config_id = bp_record[BpResearchTreePackField.SP_PACK_ID] if item_type == CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK_SP else bp_record[BpResearchTreePackField.PACK_ID]
    elif item_type == CfgResDefField.ResId.RES_ID_PAINTING:
        if TableID.USER_PAINTING not in unique_goods_dict:
            unique_goods_dict[TableID.USER_PAINTING] = GameDataMgr().get_table_for_unique_key(TableID.USER_PAINTING, UserPaintingField.UNIQUE_ID)
        painting_record = unique_goods_dict[TableID.USER_PAINTING].get(unique_id)
        if not painting_record:
            continue
        item_config_id = painting_record[UserPaintingField.PAINTING_ID]
    elif item_type == CfgResDefField.ResId.RES_ID_LEGACY_ITEM:
        if TableID.LEGACY_ITEM not in unique_goods_dict:
            unique_goods_dict[TableID.LEGACY_ITEM] = GameDataMgr().get_table_for_unique_key(TableID.LEGACY_ITEM, LegacyItemField.UNIQUE_ID)
        legacy_record = unique_goods_dict[TableID.LEGACY_ITEM].get(unique_id)
        if not legacy_record:
            continue
        item_config_id = legacy_record[LegacyItemField.LEGACY_ID]
    elif item_type == CfgResDefField.ResId.RES_ID_TECH_BLUEPRINT:
        if TableID.USER_TECH_BLUEPRINT not in unique_goods_dict:
            unique_goods_dict[TableID.USER_TECH_BLUEPRINT] = GameDataMgr().get_table_for_unique_key(TableID.USER_TECH_BLUEPRINT, UserTechBlueprintField.UNIQUE_ID)
        tech_blueprint = unique_goods_dict[TableID.USER_TECH_BLUEPRINT].get(unique_id)
        if not tech_blueprint:
            continue
        item_config_id = tech_blueprint[UserTechBlueprintField.CFG_BP_ID]
    elif item_type == CfgResDefField.ResId.RES_ID_EQUIPMENT:
        if TableID.USER_EQUIPMENT not in unique_goods_dict:
            unique_goods_dict[TableID.USER_EQUIPMENT] = GameDataMgr().get_table_for_unique_key(TableID.USER_EQUIPMENT, UserEquipmentField.UNIQUE_ID)
        equipment_record = unique_goods_dict[TableID.USER_EQUIPMENT].get(unique_id)
        if not equipment_record:
            continue
        item_config_id = equipment_record[UserEquipmentField.CFG_EQUIPMENT_ID]
    elif item_type == CfgResDefField.ResId.RES_ID_TECH_ITEM:
        if TableID.USER_TECH_ITEM not in unique_goods_dict:
            unique_goods_dict[TableID.USER_TECH_ITEM] = GameDataMgr().get_table_for_unique_key(TableID.USER_TECH_ITEM, UserTechItemField.UNIQUE_ID)
        tech_item_record = unique_goods_dict[TableID.USER_TECH_ITEM].get(unique_id)
        if not tech_item_record:
            continue
        item_config_id = tech_item_record[UserTechItemField.CFG_ITEM_ID]
    elif item_type == CfgResDefField.ResId.RES_ID_ASSET_PACK:
        if TableID.USER_ASSET_PACK not in unique_goods_dict:
            unique_goods_dict[TableID.USER_ASSET_PACK] = GameDataMgr().get_table_for_unique_key(TableID.USER_ASSET_PACK, UserAssetPackField.UNIQUE_ID)
        asset_pack_record = unique_goods_dict[TableID.USER_ASSET_PACK].get(unique_id)
        if not asset_pack_record:
            continue
        item_config_id = asset_pack_record[UserAssetPackField.CFG_ASSET_ID]
    elif item_type == CfgResDefField.ResId.RES_ID_ASSET_PACK_SP:
        if TableID.USER_ASSET_PACK not in unique_goods_dict:
            unique_goods_dict[TableID.USER_ASSET_PACK] = GameDataMgr().get_table_for_unique_key(TableID.USER_ASSET_PACK, UserAssetPackField.UNIQUE_ID)
        asset_pack_record = unique_goods_dict[TableID.USER_ASSET_PACK].get(unique_id)
        if not asset_pack_record:
            continue
        item_config_id = asset_pack_record[UserAssetPackField.CFG_ASSET_PACK_SP_ID]
    elif item_type == CfgResDefField.ResId.RES_ID_PEAK_AUTH_ITEM:
        if TableID.PEAK_AUTH_ITEM not in unique_goods_dict:
            unique_goods_dict[TableID.PEAK_AUTH_ITEM] = GameDataMgr().get_table_for_unique_key(TableID.PEAK_AUTH_ITEM, PeakAuthItemField.UNIQUE_ID)
        peak_auth_record = unique_goods_dict[TableID.PEAK_AUTH_ITEM].get(unique_id)
        if not peak_auth_record:
            continue
        item_config_id = peak_auth_record[PeakAuthItemField.CFG_PEAK_AUTH_ITEM]
    elif item_type == CfgResDefField.ResId.RES_ID_HERO_AUTH_ITEM:
        if TableID.HERO_AUTH_ITEM not in unique_goods_dict:
            unique_goods_dict[TableID.HERO_AUTH_ITEM] = GameDataMgr().get_table_for_unique_key(TableID.HERO_AUTH_ITEM, HeroAuthItemField.UNIQUE_ID)
        hero_auth_record = unique_goods_dict[TableID.HERO_AUTH_ITEM].get(unique_id)
        if not hero_auth_record:
            continue
        item_config_id = hero_auth_record[HeroAuthItemField.CFG_ID]
    
    if item_type not in ret_dict:
        ret_dict[item_type] = { }
if item_config_id not in ret_dict[item_type]:
    ret_dict[item_type][item_config_id] = []
ret_dict[item_type][item_config_id].append(record)
continue
return ret_dict
