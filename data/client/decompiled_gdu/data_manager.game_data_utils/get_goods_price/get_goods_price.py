# Source Generated with Decompyle++
# File: get_goods_price.pyc (Python 3.11)

utils = utils
import common
common_config = common_config
import common.config
SDKMgr = SDKMgr
import sdk.sdk_mgr
goods_price = { }

def is_type_goods(goods_id = None):
    if type == GoodsType.ALL:
        return True
    if None == GoodsType.SINGLEUSE:
        return True if goods_id < 7 else False
    if None == GoodsType.MICROPKG:
        if  < 99, goods_id or 99, goods_id < 200:
            pass
        
    
    return False
    if type == GoodsType.SEASON:
        if  < 199, goods_id or 199, goods_id < 300:
            pass
        else:
            True
    
    return False
    if type == GoodsType.BLACKMARK_CONTRACT:
        if  < 399, goods_id or 399, goods_id < 500:
            pass
        else:
            True
    
    return False
    if type == GoodsType.FIRST_PURCHASE:
        return True if goods_id == 300 else False
    if True == GoodsType.TECHPOINT:
        return True if goods_id in (301, 302, 303) else False
    if True == GoodsType.HERITAGE_PACK:
        return True if goods_id in (402, 403) else False
    if None in (GoodsType.NEWBIE_PACK, GoodsType.EQUIPMENT_PACKAGE):
        Tb_cfg_gift_pack
        
        def six.itervalues(Tb_cfg_gift_pack.get_all_data())()(.0 = None):
            return [ record[Tb_cfg_gift_pack.GOODS_ID] for record in .0 ]

        return goods_id in goods_list
    if None == GoodsType.LIMITED_PACKAGE:
        if  < 306, goods_id or 306, goods_id < 315:
            pass
        
    
    return False
    if type == GoodsType.SPECIAL_SHOP_ITEM:
        return True if goods_id in (317, 415) else False
    if True == GoodsType.PANGU_PACKAGE:
        return True if goods_id in (320, 321, 322, 323, 324, 325) else False


def get_config_price(currency = None, try_get_again = None):
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

if common_config.get_game_region() == common_config.REGION_CHINA:
    get_config_price(Tb_cfg_goods.PRICE_RMB, try_get_again = False)
elif common_config.is_tw_area() and utils.is_win32():
    get_config_price(Tb_cfg_goods.PRICE_TWD, try_get_again = False)
elif common_config.get_game_region() == common_config.REGION_GLOBAL and SDKMgr().app_channel_name == 'onestore':
    get_config_price(Tb_cfg_goods.PRICE_KRW, try_get_again = False)
else:
    price_dict = SDKMgr().get_goods_price()
    if price_dict:
        print('[RechargeLOG]: Get exchange price success')
        print('[RechargeLOG]: SDK exchange price:{0}'.format(price_dict))
        all_goods_data = Tb_cfg_goods.get_all_data()
        for goods_id, goods_data in six.iteritems(all_goods_data):
            if is_type_goods(goods_id):
                product_id = goods_data[Tb_cfg_goods.PRODUCT_ID]
                if product_id in list(price_dict.keys()):
                    (price_symbol, price_num) = goods_price_spliter(price_dict[product_id]['price'])
                    if not price_symbol or price_num:
                        (price_symbol, price_num) = goods_price_spliter(goods_data[Tb_cfg_goods.PRICE_DOLLAR])
                        goods_price[goods_id] = [
                            'USD',
                            price_num]
                        continue
                    goods_price[goods_id] = [
                        price_dict[product_id]['priceCurrencyCode'],
                        price_num]
                    continue
                (price_symbol, price_num) = goods_price_spliter(goods_data[Tb_cfg_goods.PRICE_DOLLAR])
                goods_price[goods_id] = [
                    'USD',
                    price_num]
        print('[RechargeLOG]: Get exchange price failed')
    get_config_price(Tb_cfg_goods.PRICE_DOLLAR, try_get_again = True)
print('[RechargeLOG]: goods_price:{0}'.format(goods_price))
return goods_price
