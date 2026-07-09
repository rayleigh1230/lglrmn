# Source Generated with Decompyle++
# File: get_config_price.pyc (Python 3.11)

all_goods_data = Tb_cfg_goods.get_all_data()
for goods_id, goods_data in six.iteritems(all_goods_data):
    if is_type_goods(goods_id):
        (price_symbol, price_num) = goods_price_spliter(goods_data[currency])
        if currency == Tb_cfg_goods.PRICE_DOLLAR:
            price_symbol = 'USD'
        elif currency == Tb_cfg_goods.PRICE_TWD:
            price_symbol = 'TWD'
        goods_price[goods_id] = [
            price_symbol,
            price_num]
    if try_get_again:
        SDKMgr().request_goods_info_in_app()
        return None
    return None
