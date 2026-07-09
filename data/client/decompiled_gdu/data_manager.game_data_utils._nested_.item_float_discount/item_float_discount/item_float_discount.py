# Source Generated with Decompyle++
# File: item_float_discount.pyc (Python 3.11)

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
