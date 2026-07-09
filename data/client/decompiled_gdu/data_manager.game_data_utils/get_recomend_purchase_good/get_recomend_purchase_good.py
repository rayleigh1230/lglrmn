# Source Generated with Decompyle++
# File: get_recomend_purchase_good.pyc (Python 3.11)

shop_view_utils = shop_view_utils
import ui
ACTIVITY_CARNIVAL_2024_STORE_ITEM_ID = ACTIVITY_CARNIVAL_2024_STORE_ITEM_ID
CELEBRATION_2024_STORE_ITEM_ID = CELEBRATION_2024_STORE_ITEM_ID
import ui.shop_view_config
get_military_prestige_item_id_ls = get_military_prestige_item_id_ls
import ui.military_prestige_reward_detail_view
store_record = GameDataMgr().get_record(TableID.USER_STORE, GameDataMgr().user_id)
if store_record:
    store_goods = store_record[UserStoreField.GOODS]
    item_info = parse_cfg_str_to_list_of_list(store_goods, True)
    item_id_list = item_info()
    normal_item_id_set = set(item_id_list)
    mp_item_id_ls = get_military_prestige_item_id_ls()
    mp_item_idx_ls = mp_item_id_ls()
    item_id_list = item_id_list()
    celebration_utils = celebration_utils
    import ui.activity_celebration
    if celebration_utils.check_celebration_2024_gift_pack_open():
        pass
    activity_carnival_utils = activity_carnival_utils
    import ui.activity_carnival
    if activity_carnival_utils.check_activity_carnival_gift_pack_open():
        activity_data = ActivityBaseDataMgr().get_activity_data(activity_carnival_utils.get_activity_carnival_gift_pack_id())
        amount_limit = 10
        if activity_data:
            condition_list = parse_cfg_str_to_list_of_list(activity_data.conditions, is_num = True)
            amount_limit = len(condition_list)
    item_purchase_limit_amount = { }
    for item in item_info:
        item_id = item[0]
        item_limit_amount = item[1]
        item_purchase_limit_amount[item_id] = item_limit_amount
        normal_idx = 0
        normal_idx_2_real_item_idx = { }
        for idx, item_id in enumerate(item_id_list):
            if item_id in normal_item_id_set:
                normal_idx_2_real_item_idx[normal_idx] = idx
                normal_idx += 1
            store_triple_item_id_list = parse_cfg_str_to_dict_of_list(store_record[UserStoreField.SPECIAL_GOODS], True)
            purchased_ls = parse_cfg_str_to_list(store_record[UserStoreField.PURCHASE_RECORD], True)
            purchased_ls = enumerate(purchased_ls)()
            item_purchased_amount = { }
            for item_idx, amount in enumerate(purchased_ls):
                item_id = item_id_list[normal_idx_2_real_item_idx[item_idx]]
                item_purchased_amount[item_id] = amount
                if activity_carnival_utils.check_activity_carnival_gift_pack_open():
                    activity_record = GameDataMgr().get_table(TableID.ACTIVITY)
                    pack_activity_record = None
                    for record in six.itervalues(activity_record):
                        if record[ActivityField.ACTIVITY_ID] == activity_carnival_utils.get_activity_carnival_gift_pack_id():
                            pack_activity_record = record
                            (lambda .0 = None: pass# WARNING: Decompyle incomplete
)
                        
                        if pack_activity_record:
                            activity_data = JsonUtil.loads(pack_activity_record[ActivityField.ACTIVITY_DATA])
    
    def item_float_discount(item_id = None, cfg_item_record = None):
        float_discount = 1
        cfg_record = cfg_item_record
        item_cfg_id = item_id
        if cfg_record:
            purchased_amount = item_purchased_amount.get(item_cfg_id, 0)
            float_discount = shop_view_utils.get_item_float_discount(item_cfg_id, purchased_amount)
            if item_cfg_id == ACTIVITY_CARNIVAL_2024_STORE_ITEM_ID:
                get_activity_carnival_gift_pack_id = get_activity_carnival_gift_pack_id
                import ui.activity_carnival.activity_carnival_utils
                activity_data = ActivityBaseDataMgr().get_activity_data(get_activity_carnival_gift_pack_id())
                price_condition = parse_cfg_str_to_list_of_list(activity_data.conditions, is_num = True)
                discount_num = 0
                min_price = price_condition[0][1]
                for res_id, price in enumerate(price_condition):
                    if price > min_price:
                        discount_num = idx
                    
                    if discount_num > 0:
                        float_discount = 0.5 if discount_num > purchased_amount else 1
        return float_discount

    
    def item_can_buy(item_id = None):
        total_amount = item_purchase_limit_amount.get(item_id, 0)
        if total_amount == 0:
            return True
        can_purchase_amount = None(0, total_amount - item_purchased_amount.get(item_id, 0))
        if can_purchase_amount == 0:
            return False

    all_item_data = []
    for item_id in item_id_list:
        cfg_item_record = Tb_cfg_user_store_item.get(item_id)
        if cfg_item_record:
            goods = parse_cfg_str_to_list_of_list(cfg_item_record[Tb_cfg_user_store_item.GOODS], True)
            if goods:
                good_id = goods[0][0]
            else:
                good_id = cfg_item_record[Tb_cfg_user_store_item.REWARD_ID]
            if good_id in (CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK, CfgResDefField.ResId.RES_ID_BP_RESEARCH_TREE_PACK_SP):
                data = {
                    'item_id': item_id,
                    'cfg_record': cfg_item_record,
                    'float_discount': item_float_discount(item_id, cfg_item_record),
                    'is_can_purchase': item_can_buy(item_id) }
                all_item_data.append(data)
        for index, item_list in six.iteritems(store_triple_item_id_list):
            triple_item_id = item_list[0]
            cfg_item_record = Tb_cfg_user_store_item.get(triple_item_id)
            triple_data = {
                'item_id': triple_item_id,
                'cfg_record': cfg_item_record,
                'float_discount': item_float_discount(triple_item_id, cfg_item_record),
                'is_can_purchase': item_can_buy(triple_item_id) }
            all_item_data.append(triple_data)
            score_data = {
                'cfg_record': {
                    Tb_cfg_user_store_item.RECOMMEND_WEIGHT: 99 },
                'float_discount': 1,
                'is_can_purchase': True }
            all_item_data.append(score_data)
            
            def sort_key(data):
                return (data['float_discount'], -data['is_can_purchase'], data['cfg_record'][Tb_cfg_user_store_item.RECOMMEND_WEIGHT])

            sorted_item_data = sorted(all_item_data, key = sort_key)
            purchase_item_data = sorted_item_data[0]
            replace_item_id = get_loop_replace_item_id(purchase_item_data['cfg_record'], purchase_item_data['item_id'])
            if replace_item_id:
                purchase_cfg_record = Tb_cfg_user_store_item.get(replace_item_id)
                purchase_goods = purchase_cfg_record[Tb_cfg_user_store_item.GOODS]
                purchase_goods = parse_cfg_str_to_list_of_list(purchase_goods, True)
            else:
                purchase_goods = purchase_item_data['cfg_record'][Tb_cfg_user_store_item.GOODS]
                purchase_goods = parse_cfg_str_to_list_of_list(purchase_goods, True)
    if purchase_goods:
        purchase_goods = purchase_goods[0]
        return purchase_goods
    return None
    return None
